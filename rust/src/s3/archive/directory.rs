use std::collections::BTreeMap;

use anyhow::{Context, Result, anyhow, ensure};
use bytes::Bytes;

use super::{S3RangeReader, SourceByteBudget, SourceClient, SourcePlanningPermit, align_down};

const EOCD_SIGNATURE: [u8; 4] = 0x0605_4b50_u32.to_le_bytes();
const ZIP64_LOCATOR_SIGNATURE: [u8; 4] = 0x0706_4b50_u32.to_le_bytes();
const ZIP64_EOCD_SIGNATURE: [u8; 4] = 0x0606_4b50_u32.to_le_bytes();
const EOCD_LEN: u64 = 22;
const MAX_EOCD_COMMENT_LEN: u64 = u16::MAX as u64;
const ZIP64_LOCATOR_LEN: u64 = 20;
const ZIP64_EOCD_MIN_LEN: u64 = 56;
const MIN_CENTRAL_DIRECTORY_ENTRY_BYTES: u64 = 46;
const MAX_PARSER_DIRECTORY_BUFFER_BYTES: u64 = 20 * 1024 * 1024;
const ENTRY_METADATA_ESTIMATE_BYTES: u64 = 512;
const DIRECTORY_ALLOCATION_FACTOR: u64 = 4;

pub(crate) struct PreparedZipDirectoryReader {
    pub(crate) reader: S3RangeReader,
    pub(crate) central_directory_start: u64,
    pub(crate) _planning_permit: SourcePlanningPermit,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct ZipDirectoryInfo {
    central_directory_start: u64,
    central_directory_size: u64,
    entry_count: u64,
    comment_len: u64,
}

pub(crate) async fn prepare_zip_directory_reader(
    source: std::sync::Arc<SourceClient>,
    chunk_size: usize,
    budget: std::sync::Arc<SourceByteBudget>,
    streaming_headroom_bytes: u64,
) -> Result<PreparedZipDirectoryReader> {
    ensure!(
        source.len() >= EOCD_LEN,
        "source ZIP is too short to contain an end-of-central-directory record"
    );

    let chunk_size = chunk_size.max(1);
    let mut preloaded = BTreeMap::new();
    let mut preloaded_bytes = 0_u64;
    let eocd_offset = locate_eocd(
        &source,
        chunk_size,
        budget.limit_bytes(),
        &mut preloaded,
        &mut preloaded_bytes,
    )
    .await?;
    let info = read_directory_info(
        &source,
        chunk_size,
        budget.limit_bytes(),
        eocd_offset,
        &mut preloaded,
        &mut preloaded_bytes,
    )
    .await?;
    let planning_bytes = directory_memory_estimate(info, preloaded_bytes)?;
    let combined_bytes = planning_bytes
        .checked_add(streaming_headroom_bytes)
        .ok_or_else(|| anyhow!("ZIP planning and streaming memory estimate overflowed"))?;
    ensure!(
        combined_bytes <= budget.limit_bytes(),
        "source ZIP planning requires an estimated {planning_bytes} central-directory bytes plus {streaming_headroom_bytes} streaming bytes, exceeding the {}-byte invocation-global source budget",
        budget.limit_bytes()
    );
    let planning_permit = budget
        .reserve_planning(planning_bytes)
        .await
        .context("failed to reserve source budget for ZIP central-directory planning")?;

    Ok(PreparedZipDirectoryReader {
        reader: S3RangeReader::with_preloaded(source, chunk_size, preloaded),
        central_directory_start: info.central_directory_start,
        _planning_permit: planning_permit,
    })
}

async fn locate_eocd(
    source: &std::sync::Arc<SourceClient>,
    chunk_size: usize,
    budget_limit: u64,
    preloaded: &mut BTreeMap<u64, Bytes>,
    preloaded_bytes: &mut u64,
) -> Result<u64> {
    let source_len = source.len();
    let search_start = source_len.saturating_sub(EOCD_LEN + MAX_EOCD_COMMENT_LEN);
    let latest_signature = source_len - EOCD_LEN;
    let mut scan_end = source_len;

    loop {
        let probe = scan_end.saturating_sub(1);
        let block_start = load_block_for_offset(
            source,
            chunk_size,
            budget_limit,
            probe,
            preloaded,
            preloaded_bytes,
        )
        .await?;
        let block = preloaded
            .get(&block_start)
            .expect("preloaded source block exists");
        let block_end = block_start + block.len() as u64;
        let candidate_start = block_start.max(search_start);
        let candidate_end = block_end.min(latest_signature.saturating_add(4));
        let overlap_end = source_len.min(candidate_end.saturating_add(3));
        let candidate = cached_span(
            source,
            chunk_size,
            budget_limit,
            candidate_start,
            overlap_end.saturating_sub(candidate_start),
            preloaded,
            preloaded_bytes,
        )
        .await?;

        for relative in (0..candidate.len().saturating_sub(3)).rev() {
            let absolute = candidate_start + relative as u64;
            if absolute > latest_signature || candidate[relative..relative + 4] != EOCD_SIGNATURE {
                continue;
            }
            let header = cached_span(
                source,
                chunk_size,
                budget_limit,
                absolute,
                EOCD_LEN,
                preloaded,
                preloaded_bytes,
            )
            .await?;
            let comment_len = u16_at(&header, 20) as u64;
            if absolute
                .checked_add(EOCD_LEN)
                .and_then(|end| end.checked_add(comment_len))
                == Some(source_len)
            {
                return Ok(absolute);
            }
        }

        if block_start <= search_start || block_start == 0 {
            break;
        }
        scan_end = block_start;
    }

    Err(anyhow!(
        "unable to locate a bound ZIP end-of-central-directory record"
    ))
}

async fn read_directory_info(
    source: &std::sync::Arc<SourceClient>,
    chunk_size: usize,
    budget_limit: u64,
    eocd_offset: u64,
    preloaded: &mut BTreeMap<u64, Bytes>,
    preloaded_bytes: &mut u64,
) -> Result<ZipDirectoryInfo> {
    let eocd = cached_span(
        source,
        chunk_size,
        budget_limit,
        eocd_offset,
        EOCD_LEN,
        preloaded,
        preloaded_bytes,
    )
    .await?;
    ensure!(
        u32_at(&eocd, 0).to_le_bytes() == EOCD_SIGNATURE,
        "invalid ZIP EOCD signature"
    );
    let disk = u16_at(&eocd, 4);
    let directory_disk = u16_at(&eocd, 6);
    let entries_on_disk = u16_at(&eocd, 8);
    let entries = u16_at(&eocd, 10);
    let directory_size = u32_at(&eocd, 12);
    let directory_start = u32_at(&eocd, 16);
    let comment_len = u16_at(&eocd, 20) as u64;

    ensure!(
        disk == 0 && directory_disk == 0,
        "split ZIP archives are not supported"
    );
    ensure!(
        entries_on_disk == entries,
        "split ZIP central-directory entry counts are not supported"
    );

    let locator_offset = eocd_offset.checked_sub(ZIP64_LOCATOR_LEN);
    let locator = match locator_offset {
        Some(offset) => {
            let bytes = cached_span(
                source,
                chunk_size,
                budget_limit,
                offset,
                ZIP64_LOCATOR_LEN,
                preloaded,
                preloaded_bytes,
            )
            .await?;
            (bytes[..4] == ZIP64_LOCATOR_SIGNATURE).then_some((offset, bytes))
        }
        None => None,
    };

    let (info, boundary) = if let Some((locator_offset, locator)) = locator {
        ensure!(
            u32_at(&locator, 4) == 0,
            "split ZIP64 archives are not supported"
        );
        ensure!(
            u32_at(&locator, 16) == 1,
            "split ZIP64 archives are not supported"
        );
        let zip64_offset = u64_at(&locator, 8);
        let record = cached_span(
            source,
            chunk_size,
            budget_limit,
            zip64_offset,
            ZIP64_EOCD_MIN_LEN,
            preloaded,
            preloaded_bytes,
        )
        .await?;
        ensure!(
            record[..4] == ZIP64_EOCD_SIGNATURE,
            "invalid ZIP64 end-of-central-directory signature"
        );
        let record_size = u64_at(&record, 4);
        ensure!(
            record_size >= 44,
            "ZIP64 end-of-central-directory record is shorter than its fixed fields"
        );
        let record_end = zip64_offset
            .checked_add(12)
            .and_then(|offset| offset.checked_add(record_size))
            .ok_or_else(|| anyhow!("ZIP64 end-of-central-directory range overflowed"))?;
        ensure!(
            record_end == locator_offset,
            "ZIP64 end-of-central-directory record is not bound to its locator"
        );
        ensure!(
            u32_at(&record, 16) == 0 && u32_at(&record, 20) == 0,
            "split ZIP64 archives are not supported"
        );
        let zip64_entries_on_disk = u64_at(&record, 24);
        let zip64_entries = u64_at(&record, 32);
        let zip64_directory_size = u64_at(&record, 40);
        let zip64_directory_start = u64_at(&record, 48);
        ensure!(
            zip64_entries_on_disk == zip64_entries,
            "split ZIP64 central-directory entry counts are not supported"
        );
        ensure!(
            compatible_u16(entries, zip64_entries)
                && compatible_u32(directory_size, zip64_directory_size)
                && compatible_u32(directory_start, zip64_directory_start),
            "legacy and ZIP64 central-directory records disagree"
        );
        (
            ZipDirectoryInfo {
                central_directory_start: zip64_directory_start,
                central_directory_size: zip64_directory_size,
                entry_count: zip64_entries,
                comment_len,
            },
            zip64_offset,
        )
    } else {
        ensure!(
            entries != u16::MAX && directory_size != u32::MAX && directory_start != u32::MAX,
            "ZIP64 sentinel fields require a ZIP64 end-of-central-directory locator"
        );
        (
            ZipDirectoryInfo {
                central_directory_start: directory_start as u64,
                central_directory_size: directory_size as u64,
                entry_count: entries as u64,
                comment_len,
            },
            eocd_offset,
        )
    };

    validate_directory_info(info, boundary, source.len())?;
    Ok(info)
}

fn validate_directory_info(info: ZipDirectoryInfo, boundary: u64, source_len: u64) -> Result<()> {
    let directory_end = info
        .central_directory_start
        .checked_add(info.central_directory_size)
        .ok_or_else(|| anyhow!("ZIP central-directory range overflowed"))?;
    ensure!(
        directory_end == boundary && directory_end <= source_len,
        "ZIP central directory is not bound to its end record"
    );
    let minimum_size = info
        .entry_count
        .checked_mul(MIN_CENTRAL_DIRECTORY_ENTRY_BYTES)
        .ok_or_else(|| anyhow!("ZIP central-directory entry count overflowed"))?;
    ensure!(
        minimum_size <= info.central_directory_size,
        "ZIP central-directory entry count cannot fit in the declared directory size"
    );
    Ok(())
}

fn directory_memory_estimate(info: ZipDirectoryInfo, preloaded_bytes: u64) -> Result<u64> {
    let parser_buffer = info
        .central_directory_start
        .min(MAX_PARSER_DIRECTORY_BUFFER_BYTES);
    let decoded_directory = info
        .central_directory_size
        .checked_mul(DIRECTORY_ALLOCATION_FACTOR)
        .ok_or_else(|| anyhow!("ZIP central-directory memory estimate overflowed"))?;
    let entry_metadata = info
        .entry_count
        .checked_mul(ENTRY_METADATA_ESTIMATE_BYTES)
        .ok_or_else(|| anyhow!("ZIP entry metadata estimate overflowed"))?;
    let comment = info
        .comment_len
        .checked_mul(2)
        .ok_or_else(|| anyhow!("ZIP comment memory estimate overflowed"))?;

    [
        preloaded_bytes,
        parser_buffer,
        decoded_directory,
        entry_metadata,
        comment,
    ]
    .into_iter()
    .try_fold(0_u64, |total, value| {
        total
            .checked_add(value)
            .ok_or_else(|| anyhow!("ZIP planning memory estimate overflowed"))
    })
}

async fn cached_span(
    source: &std::sync::Arc<SourceClient>,
    chunk_size: usize,
    budget_limit: u64,
    start: u64,
    len: u64,
    preloaded: &mut BTreeMap<u64, Bytes>,
    preloaded_bytes: &mut u64,
) -> Result<Vec<u8>> {
    let end = start
        .checked_add(len)
        .ok_or_else(|| anyhow!("ZIP metadata range overflowed"))?;
    ensure!(
        end <= source.len(),
        "ZIP metadata range extends beyond the source object"
    );
    let mut output = Vec::with_capacity(
        usize::try_from(len).context("ZIP metadata range does not fit in memory")?,
    );
    let mut position = start;
    while position < end {
        let block_start = load_block_for_offset(
            source,
            chunk_size,
            budget_limit,
            position,
            preloaded,
            preloaded_bytes,
        )
        .await?;
        let block = preloaded
            .get(&block_start)
            .expect("preloaded source block exists");
        let relative = usize::try_from(position - block_start)
            .context("ZIP metadata block offset does not fit in memory")?;
        let remaining = usize::try_from(end - position)
            .context("ZIP metadata remaining length does not fit in memory")?;
        let take = remaining.min(block.len().saturating_sub(relative));
        ensure!(take > 0, "preloaded ZIP metadata block made no progress");
        output.extend_from_slice(&block[relative..relative + take]);
        position += take as u64;
    }
    Ok(output)
}

async fn load_block_for_offset(
    source: &std::sync::Arc<SourceClient>,
    chunk_size: usize,
    budget_limit: u64,
    offset: u64,
    preloaded: &mut BTreeMap<u64, Bytes>,
    preloaded_bytes: &mut u64,
) -> Result<u64> {
    ensure!(
        offset < source.len(),
        "ZIP metadata offset is outside the source object"
    );
    let chunk_size = chunk_size.max(1) as u64;
    let start = align_down(offset, chunk_size);
    if preloaded.contains_key(&start) {
        return Ok(start);
    }
    let end = source
        .len()
        .saturating_sub(1)
        .min(start.saturating_add(chunk_size - 1));
    let len = end - start + 1;
    let projected = preloaded_bytes
        .checked_add(len)
        .ok_or_else(|| anyhow!("preloaded ZIP metadata size overflowed"))?;
    ensure!(
        projected <= budget_limit,
        "ZIP end-record search exceeds the invocation-global source budget"
    );
    let bytes = source
        .get_range(start, end)
        .await
        .context("failed to read ZIP directory metadata")?;
    *preloaded_bytes = projected;
    preloaded.insert(start, bytes);
    Ok(start)
}

fn compatible_u16(legacy: u16, extended: u64) -> bool {
    legacy == u16::MAX || legacy as u64 == extended
}

fn compatible_u32(legacy: u32, extended: u64) -> bool {
    legacy == u32::MAX || legacy as u64 == extended
}

fn u16_at(bytes: &[u8], offset: usize) -> u16 {
    u16::from_le_bytes([bytes[offset], bytes[offset + 1]])
}

fn u32_at(bytes: &[u8], offset: usize) -> u32 {
    u32::from_le_bytes(
        bytes[offset..offset + 4]
            .try_into()
            .expect("four-byte field"),
    )
}

fn u64_at(bytes: &[u8], offset: usize) -> u64 {
    u64::from_le_bytes(
        bytes[offset..offset + 8]
            .try_into()
            .expect("eight-byte field"),
    )
}

#[cfg(test)]
mod tests {
    use std::io::Cursor;

    use async_zip::base::read::seek::ZipFileReader;

    use super::{ZipDirectoryInfo, directory_memory_estimate, validate_directory_info};

    #[test]
    fn central_directory_count_must_fit_the_declared_span() {
        let info = ZipDirectoryInfo {
            central_directory_start: 10,
            central_directory_size: 46,
            entry_count: 2,
            comment_len: 0,
        };

        assert!(validate_directory_info(info, 56, 78).is_err());
    }

    #[test]
    fn directory_memory_estimate_is_checked_and_conservative() {
        let info = ZipDirectoryInfo {
            central_directory_start: 1_000,
            central_directory_size: 100,
            entry_count: 2,
            comment_len: 10,
        };

        assert_eq!(directory_memory_estimate(info, 200).unwrap(), 2_644);
        assert!(
            directory_memory_estimate(
                ZipDirectoryInfo {
                    central_directory_size: u64::MAX,
                    ..info
                },
                0,
            )
            .is_err()
        );
    }

    #[tokio::test]
    async fn hostile_zip64_entry_count_is_rejected_before_allocation() {
        let declared_entries = 1_u64 << 40;
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&0x0606_4b50_u32.to_le_bytes());
        bytes.extend_from_slice(&44_u64.to_le_bytes());
        bytes.extend_from_slice(&45_u16.to_le_bytes());
        bytes.extend_from_slice(&45_u16.to_le_bytes());
        bytes.extend_from_slice(&0_u32.to_le_bytes());
        bytes.extend_from_slice(&0_u32.to_le_bytes());
        bytes.extend_from_slice(&declared_entries.to_le_bytes());
        bytes.extend_from_slice(&declared_entries.to_le_bytes());
        bytes.extend_from_slice(&0_u64.to_le_bytes());
        bytes.extend_from_slice(&0_u64.to_le_bytes());
        bytes.extend_from_slice(&0x0706_4b50_u32.to_le_bytes());
        bytes.extend_from_slice(&0_u32.to_le_bytes());
        bytes.extend_from_slice(&0_u64.to_le_bytes());
        bytes.extend_from_slice(&1_u32.to_le_bytes());
        bytes.extend_from_slice(&0x0605_4b50_u32.to_le_bytes());
        bytes.extend_from_slice(&0_u16.to_le_bytes());
        bytes.extend_from_slice(&0_u16.to_le_bytes());
        bytes.extend_from_slice(&u16::MAX.to_le_bytes());
        bytes.extend_from_slice(&u16::MAX.to_le_bytes());
        bytes.extend_from_slice(&u32::MAX.to_le_bytes());
        bytes.extend_from_slice(&u32::MAX.to_le_bytes());
        bytes.extend_from_slice(&0_u16.to_le_bytes());

        let error = ZipFileReader::with_tokio(Cursor::new(bytes))
            .await
            .err()
            .expect("hostile entry count must fail");

        assert!(error.to_string().contains("entry count"));
    }
}
