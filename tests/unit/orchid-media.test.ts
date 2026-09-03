import test from 'node:test';
import assert from 'node:assert/strict';
import { plantMedia } from '../../src/features/media/manifests/plants.ts';

const ORCHIDS = [
  ["Acuna's Star Orchid", 'https://img.atwiki.jp/rdr2jp/attach/1054/2076/Acuna%27s%20Star%20Orchid.png'],
  ['Cigar Orchid', 'https://img.atwiki.jp/rdr2jp/attach/1054/2077/Cigar%20Orchid.png'],
  ['Clamshell Orchid', 'https://img.atwiki.jp/rdr2jp/attach/1054/2078/Clamshell%20Orchid.png'],
  ["Dragon's Mouth Orchid", 'https://img.atwiki.jp/rdr2jp/attach/1054/2079/Dragon%27s%20Mouth%20Orchid.png'],
  ['Ghost Orchid', 'https://img.atwiki.jp/rdr2jp/attach/1054/2058/Ghost%20Orchid.png'],
  ['Lady of the Night Orchid', 'https://img.atwiki.jp/rdr2jp/attach/1054/2062/Lady%20of%20the%20Night%20Orchid.png'],
  ['Lady Slipper Orchid', 'https://img.atwiki.jp/rdr2jp/attach/1054/2063/Lady%20Slipper%20Orchid.png'],
  ['Moccasin Flower Orchid', 'https://img.atwiki.jp/rdr2jp/attach/1054/2065/Moccasin%20Flower%20Orchid.png'],
  ['Night Scented Orchid', 'https://img.atwiki.jp/rdr2jp/attach/1054/2080/Night%20Scented%20Orchid.png'],
  ["Queen's Orchid", 'https://img.atwiki.jp/rdr2jp/attach/1054/2047/Queen%27s%20Orchid.png'],
  ['Rat Tail Orchid', 'https://img.atwiki.jp/rdr2jp/attach/1054/2049/Rat%20Tail%20Orchid.png'],
  ["Sparrow's Egg Orchid", 'https://img.atwiki.jp/rdr2jp/attach/1054/2052/Sparrow%27s%20Egg%20Orchid.png'],
  ['Spider Orchid', 'https://img.atwiki.jp/rdr2jp/attach/1054/2045/Spider%20Orchid.png'],
] as const;

test('all thirteen orchids resolve individual in-game screenshots', () => {
  for (const [name, url] of ORCHIDS) {
    const media = plantMedia(name);
    assert.ok(media, name);
    assert.equal(media.url, url, name);
    assert.equal(media.source, 'curated-external', name);
    assert.equal(media.orientation, 'landscape', name);
    assert.equal(media.fit, 'contain', name);
  }
});
