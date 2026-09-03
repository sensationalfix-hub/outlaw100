import type { ManifestMediaEntry } from '../types.ts';

const QBR_IMAGE_ROOT = 'https://raw.githubusercontent.com/qbcore-redm/qbr-inventory/main/html/images/';
const SCHWOBY_MEDIA_ROOT = 'https://schwobygames.com/RDR2/media/';

const UPGRADED_EQUIPMENT_FALLBACK = 'https://i.ytimg.com/vi/J2cCKF_2ods/maxresdefault.jpg';
const REINFORCED_EQUIPMENT_FALLBACK = 'https://mods.club/uploads/mods/22665outlaws-from-the-west-1.jpeg';
const HORSE_TACK_FALLBACK = 'https://www.rdr2.org/wp-content/uploads/2018/11/horses1-768x432.jpg';
const TRINKET_FALLBACK = 'https://www.rdr2.org/wp-content/uploads/2018/11/trinkets-fence-768x410.jpg';

const EQUIPMENT_FILES: Record<string, string> = {
  Binoculars: 'weapon_kit_binoculars.png',
  Camera: 'weapon_kit_camera.png',
  'Electric Lantern': 'weapon_melee_electric_lantern.png',
  'Fishing Rod': 'weapon_fishingrod.png',
  Lantern: 'weapon_melee_lantern.png',
  Lasso: 'weapon_lasso.png',
};

const TALISMAN_TRINKET_FILES: Record<string, string> = {
  'Alligator Tooth Talisman': 'AlligatorToothTalisman.jpg',
  'Bear Claw Talisman': 'BearClawTalisman.jpg',
  'Bison Horn Talisman': 'BisonHornTalisman.jpg',
  'Boar Tusk Talisman': 'BoarTuskTalisman.jpg',
  'Raven Claw Talisman': 'RavenClawTalisman.jpg',
  'Beaver Tooth Trinket': 'BeaverToothTrinket.jpg',
  'Buck Antler Trinket': 'BuckAntlerTrinket.jpg',
  'Cougar Fang Trinket': 'CougarFangTrinket.jpg',
  'Coyote Fang Trinket': 'CoyoteFangTrinket.jpg',
  'Elk Antler Trinket': 'ElkAntlerTrinket.jpg',
  'Fox Claw Trinket': 'FoxClawTrinket.jpg',
  "Lion's Paw Trinket": 'LionPawTrinket.jpg',
  'Moose Antler Trinket': 'MooseAntlerTrinket.jpg',
  "Panther's Eye Trinket": 'PantherEyeTrinket.jpg',
  'Pronghorn Horn Trinket': 'PronghornHornTrinket.jpg',
  'Ram Horn Trinket': 'RamHornTrinket.jpg',
  'Tatanka Bison Horn Trinket': 'TatankaBisonHornTrinket.jpg',
  'Wolf Heart Trinket': 'WolfHeartTrinket.jpg',
};

const FOUND_TRINKETS = new Set([
  'Cat Eye Trinket',
  'Crow Beak Trinket',
  'Hawk Talon Trinket',
  'Owl Feather Trinket',
  'Shark Tooth Trinket',
  'Turtle Shell Trinket',
]);

const HORSE_TACK_GROUPS = new Set(['Bedrolls', 'Blankets', 'Horns', 'Saddlebags', 'Saddles', 'Stirrups']);

function fallback(url: string): ManifestMediaEntry {
  return {
    url,
    source: 'fallback',
    orientation: 'landscape',
    fit: 'contain',
  };
}

export function equipmentMedia(name: string, category?: string, group?: string): ManifestMediaEntry | null {
  const filename = EQUIPMENT_FILES[name];
  if (filename) {
    return {
      url: `${QBR_IMAGE_ROOT}${filename}`,
      source: 'official-game',
      orientation: 'square',
      fit: 'contain',
    };
  }

  if (category === 'weapon_equipment') {
    return fallback(UPGRADED_EQUIPMENT_FALLBACK);
  }

  if (category === 'reinforced_equipment') {
    if (name === 'EQUIPMENT') return null;
    return fallback(REINFORCED_EQUIPMENT_FALLBACK);
  }

  if (category === 'horse_equipment' && group && HORSE_TACK_GROUPS.has(group)) {
    return fallback(HORSE_TACK_FALLBACK);
  }

  if (category === 'talisman_trinket') {
    const talismanFilename = TALISMAN_TRINKET_FILES[name];
    if (talismanFilename) {
      return {
        url: `${SCHWOBY_MEDIA_ROOT}${talismanFilename}`,
        source: 'curated-external',
        orientation: 'square',
        fit: 'contain',
      };
    }
    if (FOUND_TRINKETS.has(name)) return fallback(TRINKET_FALLBACK);
  }

  return null;
}
