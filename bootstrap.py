#!/usr/bin/env python3
import base64
import hashlib
import io
import tarfile
from pathlib import Path

root = Path(__file__).resolve().parent
names = [
    "source.00",
    "source.01",
    "source.02a",
    "source.02b",
    "source.03",
    "source.04",
    "source.05",
    "source.06",
    "source.07",
    "source.08",
]
parts = [root / name for name in names]
missing = [path.name for path in parts if not path.exists()]
if missing:
    raise SystemExit(f"Missing source fragments: {', '.join(missing)}")

payload = b"".join(path.read_bytes().strip() for path in parts)
if len(payload) != 157796:
    raise SystemExit(f"Unexpected base64 payload length: {len(payload)}")
if hashlib.sha256(payload).hexdigest() != "e06ea5a98dcc0d9018fd0c5a833e3381fbe6ec3815475e5c2d347be1c3b05e3f":
    raise SystemExit("Base64 payload checksum mismatch")

archive = base64.b64decode(payload, validate=True)
if len(archive) != 118347:
    raise SystemExit(f"Unexpected archive length: {len(archive)}")
if hashlib.sha256(archive).hexdigest() != "2904eeed5f29347c5f29e63a5a7a49b56b348c4b415bfe6af01eb1e92aa9b43f":
    raise SystemExit("Archive checksum mismatch")

with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tf:
    members = tf.getmembers()
    if len(members) != 123:
        raise SystemExit(f"Unexpected archive member count: {len(members)}")
    tf.extractall(root, filter="data")

for path in root.glob("source.*"):
    path.unlink()
for path in root.glob("payload.*"):
    path.unlink()
Path(__file__).unlink()
