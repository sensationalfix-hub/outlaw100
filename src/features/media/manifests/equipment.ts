import type { ManifestMediaEntry } from '../types.ts';

const QBR_IMAGE_ROOT = 'https://raw.githubusercontent.com/qbcore-redm/qbr-inventory/main/html/images/';

const EQUIPMENT_FILES: Record<string, string> = {
  Binoculars: 'weapon_kit_binoculars.png',
  Camera: 'weapon_kit_camera.png',
  'Electric Lantern': 'weapon_melee_electric_lantern.png',
  'Fishing Rod': 'weapon_fishingrod.png',
  Lantern: 'weapon_melee_lantern.png',
  Lasso: 'weapon_lasso.png',
};

export function equipmentMedia(name: string): ManifestMediaEntry | null {
  const filename = EQUIPMENT_FILES[name];
  if (!filename) return null;
  return {
    url: `${QBR_IMAGE_ROOT}${filename}`,
    source: 'official-game',
    orientation: 'square',
    fit: 'contain',
  };
}
