"""Reproduce the stored UTF-8 ZIP fixtures with Python's standard library."""
import base64
import io
import json
from pathlib import Path
import zipfile

KEYS = [
    "carriage\rreturn.txt", "carriage\nreturn.txt", "literal%2Fsegment.txt",
    "literal/segment.txt", "plus+sign.txt", "plus sign.txt", "日本語.txt", "xml&<>\"'.txt",
]
EXCLUDED = "excluded/listing+%\r.js"

for phase, prefixes, excluded in [
    ("filters", ["runtime/listing/"], True),
    ("stale-object-cleanup-initial", ["runtime/listing/keep/", "runtime/listing/stale/"], True),
    ("stale-object-cleanup-updated", ["runtime/listing/keep/"], False),
]:
    entries = [(prefix + key, 'synthetic-listing-key=' + json.dumps(key, ensure_ascii=False, separators=(',', ':')) + '\n') for key in KEYS for prefix in prefixes]
    if excluded:
        entries.append((EXCLUDED, "excluded synthetic key\n"))
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_STORED) as archive:
        for key, body in entries:
            info = zipfile.ZipInfo(key, (1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, body.encode("utf-8"))
    Path(__file__).with_name(phase + ".zip.b64").write_text(base64.b64encode(output.getvalue()).decode("ascii") + "\n")
