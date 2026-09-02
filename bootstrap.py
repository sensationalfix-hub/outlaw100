#!/usr/bin/env python3
import base64
import io
import tarfile
from pathlib import Path

root = Path(__file__).resolve().parent
parts = sorted(root.glob('payload.*'))
if not parts:
    raise SystemExit('No payload fragments found')

payload = ''.join(part.read_text(encoding='utf-8').strip() for part in parts)
try:
    archive = base64.b64decode(payload, validate=True)
except Exception as exc:
    raise SystemExit(f'Invalid base64 payload: {exc}') from exc

with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as tf:
    tf.extractall(root)

for part in parts:
    part.unlink()
Path(__file__).unlink()
