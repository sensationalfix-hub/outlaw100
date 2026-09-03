import type { ManifestMediaEntry } from '../types.ts';

const ICON_BASE = 'https://www.gtabase.com/images/red-dead-redemption-2/weapons/icon';
const FULL_BASE = 'https://www.gtabase.com/images/red-dead-redemption-2/weapons/full';

const FILE_OVERRIDES: Record<string, string> = {
  "Algernon's Revolver": 'double-action-revolver-algernon.jpg',
  "Calloway's Revolver": 'schofield-revolver-calloway.jpg',
  "Flaco's Revolver": 'cattleman-revolver-flaco.jpg',
  "Granger's Revolver": 'cattleman-revolver-granger.jpg',
  'High Roller Revolver': 'high-roller-revolver.jpg',
  "John's Cattleman Revolver": 'cattleman-revolver-john.jpg',
  "John's Knife": 'knife-john.jpg',
  "Micah's Revolver": 'double-action-revolver-micah.jpg',
  "Midnight's Pistol": 'mauser-pistol-midnight.jpg',
  "Otis Miller's Revolver": 'schofield-revolver-miller.jpg',
  'Rare Rolling Block Rifle': 'rolling-block-rifle-rare.jpg',
  'Rare Shotgun': 'double-barreled-shotgun-rare.jpg',
  'Volatie Dynamite': 'volatile-dynamite.jpg',
};

function slugifyWeapon(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function weaponMedia(name: string): ManifestMediaEntry | null {
  if (!name || name === 'WEAPONS') return null;
  if (name === 'M1899 Pistol') {
    return { url: `${FULL_BASE}/m1899-pistol.jpg`, source: 'official-compendium', orientation: 'landscape', fit: 'contain' };
  }
  const file = FILE_OVERRIDES[name] ?? `${slugifyWeapon(name)}.jpg`;
  return {
    url: `${ICON_BASE}/${file}`,
    source: 'official-compendium',
    orientation: 'landscape',
    fit: 'contain',
  };
}
