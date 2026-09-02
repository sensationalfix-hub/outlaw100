#!/usr/bin/env python3
"""Extract reusable catalog, UX and media metadata from the legacy Outlaw100 HTML.

This deliberately does not import user progress/sync state. It treats the HTML as a
source of experience metadata, translations, map links, archive records and media.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any


def extract_balanced(source: str, name: str) -> str:
    match = re.search(rf"\bconst\s+{re.escape(name)}\s*=\s*", source)
    if not match:
        raise ValueError(f"Missing const {name}")
    pos = match.end()
    while pos < len(source) and source[pos].isspace():
        pos += 1
    if pos >= len(source) or source[pos] not in "[{":
        raise ValueError(f"Const {name} is not an object/array literal")
    opener = source[pos]
    closer = "}" if opener == "{" else "]"
    start = pos
    depth = 0
    quote: str | None = None
    escape = False
    while pos < len(source):
        ch = source[pos]
        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = None
            pos += 1
            continue
        if ch in "'\"`":
            quote = ch
        elif ch == opener:
            depth += 1
        elif ch == closer:
            depth -= 1
            if depth == 0:
                return source[start : pos + 1]
        pos += 1
    raise ValueError(f"Unclosed const {name}")


def eval_js_literal(literal: str) -> Any:
    program = r"""
const vm = require('node:vm');
let input='';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  const context = Object.create(null);
  const value = vm.runInNewContext('(' + input + ')', context, {timeout: 1000});
  process.stdout.write(JSON.stringify(value));
});
"""
    proc = subprocess.run(
        ["node", "-e", program], input=literal, text=True, capture_output=True, check=False
    )
    if proc.returncode != 0:
        raise ValueError(proc.stderr.strip() or "Could not evaluate JS literal")
    return json.loads(proc.stdout)


def extract_const(source: str, name: str) -> Any:
    literal = extract_balanced(source, name)
    if name == "sourceArchive":
        return json.loads(literal)
    return eval_js_literal(literal)



def extract_function(source: str, name: str) -> str:
    match = re.search(rf"\bfunction\s+{re.escape(name)}\s*\([^)]*\)\s*\{{", source)
    if not match:
        raise ValueError(f"Missing function {name}")
    start = match.start()
    brace = source.find("{", match.start())
    pos = brace
    depth = 0
    quote: str | None = None
    escape = False
    while pos < len(source):
        ch = source[pos]
        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = None
            pos += 1
            continue
        if ch in "'\"`":
            quote = ch
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return source[start:pos + 1]
        pos += 1
    raise ValueError(f"Unclosed function {name}")


def extract_chapter_intel(source: str, chapter_labels: list[str]) -> dict[str, Any]:
    fn = extract_function(source, "chapterIntel")
    program = r"""
const vm = require('node:vm');
let input='';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => input += c);
process.stdin.on('end', () => {
  const payload = JSON.parse(input);
  const out = {};
  for (const chapter of payload.chapters) {
    const context = { currentChapter: () => chapter };
    vm.createContext(context);
    vm.runInContext(payload.fn, context, {timeout: 1000});
    out[chapter] = vm.runInContext('chapterIntel()', context, {timeout: 1000});
  }
  process.stdout.write(JSON.stringify(out));
});
"""
    proc = subprocess.run(["node", "-e", program], input=json.dumps({"fn": fn, "chapters": chapter_labels}), text=True, capture_output=True, check=False)
    if proc.returncode != 0:
        raise ValueError(proc.stderr.strip() or "Could not evaluate chapterIntel")
    return json.loads(proc.stdout)

def extract_string_const(source: str, name: str) -> str:
    match = re.search(
        rf"\bconst\s+{re.escape(name)}\s*=\s*(['\"])(.*?)\1\s*;", source, re.DOTALL
    )
    if not match:
        raise ValueError(f"Missing string const {name}")
    return match.group(2)


def css_tokens(source: str) -> dict[str, str]:
    match = re.search(r":root\s*\{([^}]*)\}", source, re.DOTALL)
    if not match:
        return {}
    return {
        key: value.strip()
        for key, value in re.findall(r"--([\w-]+)\s*:\s*([^;]+);?", match.group(1))
    }


def extract_media(source: str, public_dir: Path) -> list[dict[str, Any]]:
    media_dir = public_dir / "media"
    media_dir.mkdir(parents=True, exist_ok=True)
    found: list[dict[str, Any]] = []
    seen: set[str] = set()
    pattern = re.compile(r"data:image/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\r\n]+)")
    for index, match in enumerate(pattern.finditer(source), start=1):
        fmt = "jpg" if match.group(1) in {"jpeg", "jpg"} else match.group(1)
        raw = base64.b64decode(re.sub(r"\s+", "", match.group(2)))
        digest = hashlib.sha256(raw).hexdigest()[:12]
        if digest in seen:
            continue
        seen.add(digest)
        name = f"legacy-{index:02d}-{digest}.{fmt}"
        path = media_dir / name
        path.write_bytes(raw)
        found.append(
            {
                "id": f"legacy-media-{digest}",
                "kind": "image",
                "source": "html-embedded",
                "publicPath": f"/media/{name}",
                "sha256": hashlib.sha256(raw).hexdigest(),
                "bytes": len(raw),
            }
        )
    return found


def localize_compendium_images(image_map: dict[str, str], media: list[dict[str, Any]]) -> dict[str, str]:
    by_sha = {str(asset.get("sha256", "")): str(asset.get("publicPath", "")) for asset in media}
    localized: dict[str, str] = {}
    data_pattern = re.compile(r"^data:image/(?:png|jpeg|jpg|webp);base64,(.+)$", re.DOTALL)
    for alias, value in image_map.items():
        raw_value = str(value)
        match = data_pattern.match(raw_value)
        if not match:
            localized[str(alias)] = raw_value
            continue
        raw = base64.b64decode(re.sub(r"\s+", "", match.group(1)))
        digest = hashlib.sha256(raw).hexdigest()
        public_path = by_sha.get(digest)
        if not public_path:
            raise ValueError(f"Embedded compendium image for {alias} was not extracted")
        localized[str(alias)] = public_path
    return localized


def copy_font(font: Path, public_dir: Path) -> str:
    font_dir = public_dir / "fonts"
    font_dir.mkdir(parents=True, exist_ok=True)
    target = font_dir / "chinese-rocks.otf"
    shutil.copyfile(font, target)
    return "/fonts/chinese-rocks.otf"


def build_payload(source: str, font: Path, public_dir: Path) -> dict[str, Any]:
    source_archive = extract_const(source, "sourceArchive")
    translations = extract_const(source, "SOURCE_EXACT_ES")
    story = extract_const(source, "story")
    chapter_descriptions = extract_const(source, "chapterDescriptions")
    mission_hints = extract_const(source, "missionHints")
    mission_givers = extract_const(source, "missionGivers")
    mission_gold_objectives = extract_const(source, "missionGoldObjectives")
    chapter_intel = extract_chapter_intel(source, list(story.keys()))
    map_hotspots = extract_const(source, "mapHotspots")
    challenges = extract_const(source, "auditedChallenges")
    secrets = extract_const(source, "secretChains")
    aliases = extract_const(source, "mapCanonicalAliases")
    compendium_images_raw = extract_const(source, "realCompendiumImages")

    marker_url = extract_string_const(source, "OUTLAW_MARKERS_URL")
    marker_fallback = extract_string_const(source, "OUTLAW_MARKERS_FALLBACK_URL")
    tile_url = extract_string_const(source, "OUTLAW_TILES_URL")
    plant_url = extract_string_const(source, "OUTLAW_PLANTS_URL")
    plant_fallback = extract_string_const(source, "OUTLAW_PLANTS_FALLBACK_URL")

    build_match = re.search(r'<meta\s+name="outlaw-build"\s+content="([^"]+)"', source)
    source_build = build_match.group(1) if build_match else "unknown"

    media_refs = len(re.findall(r"data:image/(?:png|jpeg|jpg|webp);base64,", source))
    media = extract_media(source, public_dir)
    compendium_images = localize_compendium_images(compendium_images_raw, media)
    font_path = copy_font(font, public_dir)
    challenge_steps = sum(len(rows) for rows in challenges.values())

    excluded = [
        {"url": plant_url, "reason": "Red Dead Online source excluded by product scope"},
        {"url": plant_fallback, "reason": "Red Dead Online source excluded by product scope"},
    ]
    active_sources = [marker_url, marker_fallback, tile_url]

    return {
        "version": 1,
        "source": {"kind": "legacy-html", "build": source_build},
        "designTokens": css_tokens(source),
        "story": story,
        "chapterDescriptions": chapter_descriptions,
        "missionHints": mission_hints,
        "missionGivers": mission_givers,
        "missionGoldObjectives": mission_gold_objectives,
        "chapterIntel": chapter_intel,
        "mapHotspots": map_hotspots,
        "auditedChallenges": challenges,
        "secretChains": secrets,
        "sourceArchive": source_archive,
        "translations": translations,
        "mapCanonicalAliases": aliases,
        "compendiumImages": compendium_images,
        "mapSources": {
            "markers": [marker_url, marker_fallback],
            "tiles": tile_url,
            "plants": [],
        },
        "activeExternalSources": active_sources,
        "excludedLegacySources": excluded,
        "mediaAssets": media,
        "fontAsset": {"family": "Chinese Rocks", "publicPath": font_path},
        "audit": {
            "sourceBuild": source_build,
            "archiveCount": len(source_archive),
            "archiveLastId": source_archive[-1].get("id") if source_archive else None,
            "archiveSections": sorted({str(row.get("section", "")) for row in source_archive}),
            "translationCount": len(translations),
            "mapHotspotCount": len(map_hotspots),
            "secretChainCount": len(secrets),
            "challengeStepCount": challenge_steps,
            "goldMissionCount": len(mission_gold_objectives),
            "goldObjectiveCount": sum(len(rows) for rows in mission_gold_objectives.values()),
            "embeddedMediaCount": len(media),
            "compendiumImageAliasCount": len(compendium_images),
            "embeddedMediaReferenceCount": media_refs,
            "progressImported": False,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", required=True, type=Path)
    parser.add_argument("--font", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--public-dir", required=True, type=Path)
    args = parser.parse_args()

    source = args.html.read_text(encoding="utf-8")
    payload = build_payload(source, args.font, args.public_dir)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(payload["audit"], ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
