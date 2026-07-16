# External ZIP fixtures

These base64-encoded fixtures preserve ZIP layouts that differ between the local header and central directory. Tests decode them in memory; the encoded form keeps the source fixture reviewable and avoids generated binary diffs.

| Fixture | Producer | Local extra bytes | Central extra bytes | Expected content |
| --- | --- | ---: | ---: | --- |
| `info-zip.zip.b64` | Info-ZIP 3.0 on Linux | 28 | 24 | `info-zip external archive\n` |
| `python-force-zip64.zip.b64` | Python 3.14 `ZipFile.open(force_zip64=True)` | 20 | 0 | `python force_zip64 external archive\n` |

The asymmetric extra-field lengths are intentional. Entry source bounds must come from the next local header or the central-directory start, while the local header remains authoritative for the compressed-data offset.
