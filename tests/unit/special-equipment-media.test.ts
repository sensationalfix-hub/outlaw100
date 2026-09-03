import test from 'node:test';
import assert from 'node:assert/strict';
import { equipmentMedia } from '../../src/features/media/manifests/equipment.ts';

const challenges = [
  'Bandit', 'Explorer', 'Gambler', 'Herbalist', 'Horseman',
  'Master Hunter', 'Sharpshooter', 'Survivalist', 'Weapons Expert',
];

const craftedTalismansAndTrinkets = [
  'Alligator Tooth Talisman', 'Bear Claw Talisman', 'Bison Horn Talisman', 'Boar Tusk Talisman', 'Raven Claw Talisman',
  'Beaver Tooth Trinket', 'Buck Antler Trinket', 'Cougar Fang Trinket', 'Coyote Fang Trinket', 'Elk Antler Trinket',
  'Fox Claw Trinket', "Lion's Paw Trinket", 'Moose Antler Trinket', "Panther's Eye Trinket", 'Pronghorn Horn Trinket',
  'Ram Horn Trinket', 'Tatanka Bison Horn Trinket', 'Wolf Heart Trinket',
];

const foundTrinkets = [
  'Cat Eye Trinket', 'Crow Beak Trinket', 'Hawk Talon Trinket',
  'Owl Feather Trinket', 'Shark Tooth Trinket', 'Turtle Shell Trinket',
];

test('weapon equipment gets contextual media', () => {
  for (const name of ['Off-Hand Holster', 'Upgraded Bandolier', 'Upgraded Gun Belt', 'Upgraded Hoster']) {
    assert.ok(equipmentMedia(name, 'weapon_equipment'), name);
  }
});

test('all real reinforced challenge equipment gets media', () => {
  for (const challenge of challenges) {
    for (const suffix of ['Bandolier', 'Gun Belt', 'Holster', 'Off-Hand Holster']) {
      const catalogName = challenge === 'Herbalist' && suffix === 'Holster' ? 'Herbalist Hoster' : `${challenge} ${suffix}`;
      assert.ok(equipmentMedia(catalogName, 'reinforced_equipment'), catalogName);
    }
  }
  assert.equal(equipmentMedia('EQUIPMENT', 'reinforced_equipment'), null);
});

test('all six horse tack groups get category fallbacks', () => {
  const representatives = [
    ['Ash', 'Saddles'],
    ['Aspen ‘Duck Bill’ Horn', 'Horns'],
    ['Baroque Stirrup', 'Stirrups'],
    ['Bayou Blanket', 'Blankets'],
    ['Bone', 'Bedrolls'],
    ['Chestnut', 'Saddlebags'],
  ] as const;

  for (const [name, group] of representatives) {
    const media = equipmentMedia(name, 'horse_equipment', group);
    assert.ok(media, `${group}: ${name}`);
    assert.equal(media.source, 'fallback', group);
  }
});

test('crafted talismans and trinkets get individual icons', () => {
  for (const name of craftedTalismansAndTrinkets) {
    const media = equipmentMedia(name, 'talisman_trinket');
    assert.ok(media, name);
    assert.equal(media.source, 'curated-external', name);
    assert.match(media.url, /schwobygames\.com\/RDR2\/media\//, name);
  }
});

test('non-crafted trinkets still get an honest category fallback', () => {
  for (const name of foundTrinkets) {
    const media = equipmentMedia(name, 'talisman_trinket');
    assert.ok(media, name);
    assert.equal(media.source, 'fallback', name);
  }
});
