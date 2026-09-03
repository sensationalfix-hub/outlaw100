import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEntityMedia } from '../../src/features/media/entity-media.ts';
import type { CatalogEntity, CatalogMediaAsset } from '../../src/lib/catalog/types.ts';

function entity(id: string, name: string, category: string, metadata: Record<string, unknown> = {}): CatalogEntity {
  return { id, type: category, name, category, metadata };
}

const canonical: CatalogMediaAsset = {
  id: 'media-1',
  kind: 'image',
  source: 'gtabase',
  publicPath: 'https://example.com/official.jpg',
  entityId: 'animal-1',
};

const QBR_IMAGE_ROOT = 'https://raw.githubusercontent.com/qbcore-redm/qbr-inventory/main/html/images/';

const COMMON_PLANTS = [
  ['Alaskan Ginseng', 'consumable_herb_alaskan_ginseng.png'],
  ['American Ginseng', 'consumable_herb_american_ginseng.png'],
  ['Bay Bolete', 'consumable_herb_bay_bolete.png'],
  ['Blackcurrant', 'consumable_herb_black_currant.png'],
  ['Blackberry', 'consumable_herb_black_berry.png'],
  ['Burdock Root', 'consumable_herb_burdock_root.png'],
  ['Chanterelles', 'consumable_herb_chanterelles.png'],
  ['Common Bulrush', 'consumable_herb_common_bulrush.png'],
  ['Creeping Thyme', 'consumable_herb_creeping_thyme.png'],
  ['Desert Sage', 'consumable_herb_desert_sage.png'],
  ['English Mace', 'consumable_herb_english_mace.png'],
  ['Evergreen Huckleberry', 'consumable_herb_evergreen_huckleberry.png'],
  ['Golden Currant', 'consumable_herb_golden_currant.png'],
  ['Hummingbird Sage', 'consumable_herb_hummingbird_sage.png'],
  ['Indian Tobacco', 'consumable_herb_indian_tobacco.png'],
  ['Milkweed', 'consumable_herb_milkweed.png'],
  ['Oleander Sage', 'consumable_herb_oleander_sage.png'],
  ['Oregano', 'consumable_herb_oregano.png'],
  ['Parasol Mushroom', 'consumable_herb_parasol_mushroom.png'],
  ['Prairie Poppy', 'consumable_herb_prairie_poppy.png'],
  ["Ram's Head", 'consumable_herb_rams_head.png'],
  ['Red Raspberry', 'consumable_herb_red_raspberry.png'],
  ['Red Sage', 'consumable_herb_red_sage.png'],
  ['Vanilla Flower', 'consumable_herb_vanilla_flower.png'],
  ['Violet Snowdrops', 'consumable_herb_violet_snowdrop.png'],
  ['Wild Carrot', 'consumable_herb_wild_carrots.png'],
  ['Wild Feverfew', 'consumable_herb_wild_feverfew.png'],
  ['Wild Mint', 'consumable_herb_wild_mint.png'],
  ['Wintergreen Berry', 'consumable_herb_wintergreen_berry.png'],
  ['Yarrow', 'consumable_herb_yarrow.png'],
] as const;

const BASE_EQUIPMENT = [
  ['Binoculars', 'weapon_kit_binoculars.png'],
  ['Camera', 'weapon_kit_camera.png'],
  ['Electric Lantern', 'weapon_melee_electric_lantern.png'],
  ['Fishing Rod', 'weapon_fishingrod.png'],
  ['Lantern', 'weapon_melee_lantern.png'],
  ['Lasso', 'weapon_lasso.png'],
] as const;

test('catalog entity media keeps source-backed image before curated fallback', () => {
  const media = resolveEntityMedia(entity('animal-1', 'American Alligator', 'animal'), [canonical]);
  assert.ok(media);
  assert.equal(media.source, 'catalog');
  assert.equal(media.url, 'https://example.com/official.jpg');
});

test('weapon media resolves a dedicated GTABase compendium icon', () => {
  const media = resolveEntityMedia(entity('weapon-1', 'Cattleman Revolver', 'weapon'), []);
  assert.ok(media);
  assert.equal(media.url, 'https://www.gtabase.com/images/red-dead-redemption-2/weapons/icon/cattleman-revolver.jpg');
  assert.equal(media.orientation, 'landscape');
  assert.equal(media.fit, 'contain');
});

test('cigarette card media resolves deterministic high-resolution GTABase artwork', () => {
  const card = entity('card-1', 'Black Belle', 'cigarette_card', { set: 'Famous Gunslingers', number: 8 });
  const media = resolveEntityMedia(card, []);
  assert.ok(media);
  assert.match(media.url ?? '', /\/igallery\/2601-2700\/RDR2_Artwork_Gunslinger_BlackBelle-2691-1920\.jpg$/);
  assert.equal(media.orientation, 'portrait');
  assert.equal(media.fit, 'contain');
});

test('regular fauna resolves an individual GTABase animal thumbnail', () => {
  const media = resolveEntityMedia(entity('animal-robin', 'American Robin', 'animal'), []);
  assert.equal(media.url, 'https://www.gtabase.com/images/red-dead-redemption-2/animals/resized/american-robin_320x177.jpg');
  assert.equal(media.fit, 'contain');
});

test('legendary fish uses the GTABase species-legendary filename convention', () => {
  const media = resolveEntityMedia(entity('fish-bluegill', 'Legendary Bluegill', 'fish'), []);
  assert.equal(media.url, 'https://www.gtabase.com/images/red-dead-redemption-2/animals/resized/bluegill-legendary_320x177.jpg');
});

test('known source typos are normalized to the actual GTABase media slug', () => {
  const smallGator = resolveEntityMedia(entity('animal-small-gator', 'American Allitgator (Small)', 'animal'), []);
  const ram = resolveEntityMedia(entity('animal-ram', 'Legendary Big Horn Ram', 'animal'), []);
  assert.equal(smallGator.url, 'https://www.gtabase.com/images/red-dead-redemption-2/animals/resized/american-alligator-small_320x177.jpg');
  assert.equal(ram.url, 'https://www.gtabase.com/images/red-dead-redemption-2/animals/resized/legendary-bighorn-ram_320x177.jpg');
});

test('horse breeds get individual official-game imagery instead of the generic fallback', () => {
  const arabian = resolveEntityMedia(entity('horse-arabian', 'Arabian', 'horse'), []);
  const paint = resolveEntityMedia(entity('horse-paint', 'American Paint', 'horse'), []);
  assert.match(arabian.url ?? '', /RDR2_Horses_ArabianHorse_WhiteArabianHorse_1-3139-360\.jpg$/);
  assert.match(paint.url ?? '', /RDR2_CigaretteCards_Horses_AmericanPaintHorse-3421-1920\.jpg$/);
  assert.notEqual(arabian.url, paint.url);
});

test('all thirty non-orchid plants resolve stable individual game inventory artwork', () => {
  for (const [name, filename] of COMMON_PLANTS) {
    const media = resolveEntityMedia(entity(`plant-${filename}`, name, 'plant'), []);
    assert.equal(media.url, `${QBR_IMAGE_ROOT}${filename}`, name);
    assert.equal(media.source, 'official-game', name);
    assert.equal(media.fit, 'contain', name);
  }
});

test('base equipment resolves stable individual game inventory artwork', () => {
  for (const [name, filename] of BASE_EQUIPMENT) {
    const media = resolveEntityMedia(entity(`equipment-${filename}`, name, 'equipment'), []);
    assert.equal(media.url, `${QBR_IMAGE_ROOT}${filename}`, name);
    assert.equal(media.source, 'official-game', name);
    assert.equal(media.fit, 'contain', name);
  }
});

test('missing compendium art stays visually empty instead of using a degraded global fallback', () => {
  const media = resolveEntityMedia(entity('unknown-x', 'Unknown Thing', 'unknown_category'), []);
  assert.ok(media);
  assert.equal(media.url, null);
  assert.equal(media.fallbackUrl, null);
  assert.equal(media.source, 'fallback');
});
