import test from 'node:test';
import assert from 'node:assert/strict';
import { manifestMediaForEntity } from '../../src/features/media/manifests/compendium.ts';

test('compendium passes special equipment context into the equipment manifest', () => {
  const horseTack = manifestMediaForEntity({
    id: 'horse-equipment:ash', type: 'equipment', name: 'Ash', category: 'horse_equipment', metadata: { group: 'Saddles' },
  });
  assert.ok(horseTack);
  assert.equal(horseTack.source, 'fallback');

  const reinforced = manifestMediaForEntity({
    id: 'equipment:bandit-bandolier', type: 'equipment', name: 'Bandit Bandolier', category: 'reinforced_equipment',
  });
  assert.ok(reinforced);

  const talisman = manifestMediaForEntity({
    id: 'equipment:bear-claw-talisman', type: 'equipment', name: 'Bear Claw Talisman', category: 'talisman_trinket',
  });
  assert.ok(talisman);
  assert.equal(talisman.source, 'curated-external');
});
