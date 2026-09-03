import type { CatalogEntity } from '../../../lib/catalog/types.ts';
import type { ManifestMediaEntry } from '../types.ts';
import { cigaretteCardMedia } from './cigarette-cards.ts';
import { weaponMedia } from './weapons.ts';

const EQUIPMENT_MEDIA: Record<string, ManifestMediaEntry> = {
  Binoculars: { url: 'https://static.wikia.nocookie.net/reddeadredemption/images/4/40/RD2_Binoculars_Symbol.png/revision/latest', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  Camera: { url: 'https://static.wikia.nocookie.net/reddeadredemption/images/7/78/Camera_rdr2.png/revision/latest', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'Fishing Rod': { url: 'https://static.wikia.nocookie.net/reddeadredemption/images/9/9f/RDR2_Fishing_rod_Compendium.png/revision/latest', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  Lantern: { url: 'https://static.wikia.nocookie.net/reddeadredemption/images/b/b0/Rdr2_lantern_symbol.png/revision/latest', source: 'official-compendium', orientation: 'square', fit: 'contain' },
  'Electric Lantern': { url: 'https://static.wikia.nocookie.net/reddeadredemption/images/b/b0/Rdr2_lantern_symbol.png/revision/latest', source: 'official-compendium', orientation: 'square', fit: 'contain' },
  Lasso: { url: 'https://www.gtabase.com/images/red-dead-redemption-2/weapons/icon/lasso.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
};

const KNOWN_COMPENDIUM_MEDIA: Record<string, ManifestMediaEntry> = {
  'American Alligator': { url: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_American_Alligator-2548-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'Bald Eagle': { url: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_Bald_Eagle-2549-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'Banded Gila Monster': { url: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_Banded_GilaMonster-2544-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'California Valley Coyote': { url: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_CaliforniaValley_Coyote-2552-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'Eastern Turkey Vulture': { url: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_EasternTurkey_Vulture-2554-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'Grizzly Bear': { url: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_NorthAmericanBrown_Bear_Grizzly-2546-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'Legendary Bharati Grizzly Bear': { url: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_NorthAmericanBrown_Bear_Grizzly-2546-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'Whitetail Buck': { url: 'https://www.gtabase.com/igallery/2901-3000/RDR2_Animal_WhitetailBuck-2987-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'Whitetail Deer': { url: 'https://www.gtabase.com/igallery/2901-3000/RDR2_Animal_WhitetailDeer-2988-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'Lake Sturgeon': { url: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_Lake_Sturgeon-2545-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  Morgan: { url: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_Morgan_Horse-2543-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
  'Tennessee Walker': { url: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_TennesseeWalker_Horse-2547-1600.jpg', source: 'official-compendium', orientation: 'landscape', fit: 'contain' },
};

export function manifestMediaForEntity(entity: CatalogEntity): ManifestMediaEntry | null {
  const cigarette = cigaretteCardMedia(entity);
  if (cigarette) return cigarette;
  if (entity.category === 'weapon') return weaponMedia(entity.name);
  if (['equipment', 'weapon_equipment', 'reinforced_equipment', 'horse_equipment', 'talisman_trinket'].includes(entity.category)) {
    return EQUIPMENT_MEDIA[entity.name] ?? null;
  }
  return KNOWN_COMPENDIUM_MEDIA[entity.name] ?? null;
}
