import type { CatalogEntity } from '../../../lib/catalog/types.ts';
import type { ManifestMediaEntry } from '../types.ts';
import { cigaretteCardMedia } from './cigarette-cards.ts';
import { equipmentMedia } from './equipment.ts';
import { faunaMedia } from './fauna.ts';
import { horseMedia } from './horses.ts';
import { plantMedia } from './plants.ts';
import { weaponMedia } from './weapons.ts';

const KNOWN_COMPENDIUM_MEDIA: Record<string, ManifestMediaEntry> = {
  'American Alligator': { url: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_American_Alligator-2548-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'Bald Eagle': { url: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_Bald_Eagle-2549-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'Banded Gila Monster': { url: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_Banded_GilaMonster-2544-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'California Valley Coyote': { url: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_CaliforniaValley_Coyote-2552-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'Eastern Turkey Vulture': { url: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_EasternTurkey_Vulture-2554-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'Grizzly Bear': { url: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_NorthAmericanBrown_Bear_Grizzly-2546-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'Whitetail Buck': { url: 'https://www.gtabase.com/igallery/2901-3000/RDR2_Animal_WhitetailBuck-2987-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'Whitetail Deer': { url: 'https://www.gtabase.com/igallery/2901-3000/RDR2_Animal_WhitetailDeer-2988-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'Lake Sturgeon': { url: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_Lake_Sturgeon-2545-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
};

export function manifestMediaForEntity(entity: CatalogEntity): ManifestMediaEntry | null {
  const cigarette = cigaretteCardMedia(entity);
  if (cigarette) return cigarette;
  if (entity.category === 'weapon') return weaponMedia(entity.name);
  if (entity.category === 'horse') return horseMedia(entity);
  if (entity.category === 'plant') return plantMedia(entity.name);
  if (['animal', 'fish'].includes(entity.category)) return KNOWN_COMPENDIUM_MEDIA[entity.name] ?? faunaMedia(entity);
  if (['equipment', 'weapon_equipment', 'reinforced_equipment', 'horse_equipment', 'talisman_trinket'].includes(entity.category)) {
    const group = typeof entity.metadata?.group === 'string' ? entity.metadata.group : undefined;
    return equipmentMedia(entity.name, entity.category, group);
  }
  return KNOWN_COMPENDIUM_MEDIA[entity.name] ?? null;
}
