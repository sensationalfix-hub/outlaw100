import type { CatalogEntity } from '../../../lib/catalog/types.ts';
import type { ManifestMediaEntry } from '../types.ts';

type SetConfig = {
  code: string;
  firstAssetId: number;
  orientation: 'portrait' | 'landscape';
  suffixes?: Record<number, string>;
};

const SETS: Record<string, SetConfig> = {
  'Fauna of America': { code: 'Animals', firstAssetId: 3409, orientation: 'landscape', suffixes: { 2: 'Bloodhound', 3: 'BlueJay', 4: 'ChannelCatfish', 7: 'LargemouthBass', 8: 'Panther', 9: 'Parrot_BlueAndYellowMacaw', 10: 'Pheasant', 11: 'AlligatorSnappingTurtle', 12: 'Turkey' } },
  'Vistas of America': { code: 'Landmarks', firstAssetId: 3397, orientation: 'landscape', suffixes: { 2: 'SaintDenis', 3: 'Blackwater', 4: 'Armadillo', 6: 'TheGrizzlies', 8: 'TallTrees', 9: 'Valentine', 11: 'Rhodes', 12: 'Annesburg' } },
  'Marvels of Travel': { code: 'Vehicles', firstAssetId: 3385, orientation: 'landscape', suffixes: { 5: 'Goat', 6: 'HotAirBalloon', 9: 'BalenerWhalingVessel', 10: 'Stagecoach', 11: 'Train_SteamLocomotive' } },
  'Amazing Inventions': { code: 'Inventions', firstAssetId: 3373, orientation: 'landscape', suffixes: { 1: 'Train_SteamLocomotive', 5: 'Revolver', 8: 'Dynamite' } },
  'Flora of America': { code: 'Plants', firstAssetId: 3361, orientation: 'portrait' },
  'World Champions': { code: 'Sports', firstAssetId: 3349, orientation: 'portrait' },
  'Gems of Beauty': { code: 'Girls', firstAssetId: 3337, orientation: 'portrait' },
  'Artists, Writers, & Poets': { code: 'Artists', firstAssetId: 3325, orientation: 'portrait', suffixes: { 10: 'CharlesChatenay' } },
  'Americans': { code: 'Americans', firstAssetId: 3313, orientation: 'portrait', suffixes: { 4: 'LeviticusCornwall' } },
  'Stars of the Stage': { code: 'Actors', firstAssetId: 3301, orientation: 'portrait' },
};

const HORSES: Record<number, { assetId: number; suffix: string }> = {
  1: { assetId: 3421, suffix: 'AmericanPaintHorse' },
  2: { assetId: 3418, suffix: 'Appaloosa' },
  3: { assetId: 3419, suffix: 'AndalusianHorse' },
  4: { assetId: 3420, suffix: 'AmericanStandardbred' },
  5: { assetId: 3412, suffix: 'NokotaHorse' },
  6: { assetId: 3417, suffix: 'Ardennes' },
  7: { assetId: 3416, suffix: 'DutchWarmblood' },
  8: { assetId: 3410, suffix: 'TurkomanHorse' },
  9: { assetId: 3415, suffix: 'HungarianHalfbred' },
  10: { assetId: 3413, suffix: 'Mustang' },
  11: { assetId: 3411, suffix: 'Thoroughbred' },
  12: { assetId: 3414, suffix: 'MissouriFoxTrotter' },
};

const GUNSLINGERS: Record<number, { assetId: number; file: string }> = {
  1: { assetId: 3430, file: 'RDR2_CigaretteCards_Gunslingers_1' },
  2: { assetId: 3429, file: 'RDR2_CigaretteCards_Gunslingers_2' },
  3: { assetId: 3428, file: 'RDR2_CigaretteCards_Gunslingers_3' },
  4: { assetId: 3427, file: 'RDR2_CigaretteCards_Gunslingers_4' },
  5: { assetId: 3426, file: 'RDR2_CigaretteCards_Gunslingers_5_FlacoHernandez' },
  6: { assetId: 2692, file: 'RDR2_Artwork_Gunslinger_SlimGrant' },
  7: { assetId: 3425, file: 'RDR2_CigaretteCards_Gunslingers_7' },
  8: { assetId: 2691, file: 'RDR2_Artwork_Gunslinger_BlackBelle' },
  9: { assetId: 2693, file: 'RDR2_Artwork_Gunslinger_BillyMidnight' },
  10: { assetId: 3424, file: 'RDR2_CigaretteCards_Gunslingers_10_EmmetGranger' },
  11: { assetId: 3423, file: 'RDR2_CigaretteCards_Gunslingers_11_JimBoyCalloway' },
  12: { assetId: 3422, file: 'RDR2_CigaretteCards_Gunslingers_12' },
};

function galleryBucket(assetId: number): string {
  const start = Math.floor((assetId - 1) / 100) * 100 + 1;
  return `${start}-${start + 99}`;
}

function galleryUrl(assetId: number, file: string): string {
  return `https://www.gtabase.com/igallery/${galleryBucket(assetId)}/${file}-${assetId}-1920.jpg`;
}

export function cigaretteCardMedia(entity: CatalogEntity): ManifestMediaEntry | null {
  if (entity.category !== 'cigarette_card') return null;
  const set = String(entity.metadata?.set ?? '');
  const number = Number(entity.metadata?.number ?? 0);
  if (!Number.isInteger(number) || number < 1 || number > 12) return null;

  if (set === 'Famous Gunslingers') {
    const entry = GUNSLINGERS[number];
    return entry ? { url: galleryUrl(entry.assetId, entry.file), source: 'curated-external', orientation: 'portrait', fit: 'contain' } : null;
  }

  if (set === 'Breeds of Horses') {
    const entry = HORSES[number];
    return entry ? { url: galleryUrl(entry.assetId, `RDR2_CigaretteCards_Horses_${entry.suffix}`), source: 'curated-external', orientation: 'landscape', fit: 'contain' } : null;
  }

  const config = SETS[set];
  if (!config) return null;
  const assetId = config.firstAssetId - (number - 1);
  const suffix = config.suffixes?.[number];
  const file = `RDR2_CigaretteCards_${config.code}_${number}${suffix ? `_${suffix}` : ''}`;
  return { url: galleryUrl(assetId, file), source: 'curated-external', orientation: config.orientation, fit: 'contain' };
}
