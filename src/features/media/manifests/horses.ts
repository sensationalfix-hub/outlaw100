import type { CatalogEntity } from '../../../lib/catalog/types.ts';
import type { ManifestMediaEntry } from '../types.ts';

const CARD_HORSES: Record<string, { assetId: number; suffix: string }> = {
  'American Paint': { assetId: 3421, suffix: 'AmericanPaintHorse' },
  'Appalooosa': { assetId: 3418, suffix: 'Appaloosa' },
  Appaloosa: { assetId: 3418, suffix: 'Appaloosa' },
  Andalusian: { assetId: 3419, suffix: 'AndalusianHorse' },
  'American Standardbred': { assetId: 3420, suffix: 'AmericanStandardbred' },
  Nokota: { assetId: 3412, suffix: 'NokotaHorse' },
  Ardennes: { assetId: 3417, suffix: 'Ardennes' },
  'Dutch Warmblood': { assetId: 3416, suffix: 'DutchWarmblood' },
  Turkoman: { assetId: 3410, suffix: 'TurkomanHorse' },
  'Hungarian Halfbred': { assetId: 3415, suffix: 'HungarianHalfbred' },
  Mustang: { assetId: 3413, suffix: 'Mustang' },
  Thoroughbred: { assetId: 3411, suffix: 'Thoroughbred' },
  'Missouri Fox Trotter': { assetId: 3414, suffix: 'MissouriFoxTrotter' },
};

const BREED_IMAGES: Record<string, string> = {
  Arabian: 'https://www.gtabase.com/igallery/3101-3200/RDR2_Horses_ArabianHorse_WhiteArabianHorse_1-3139-360.jpg',
  'Belgian Draft': 'https://www.gtabase.com/igallery/3101-3200/RDR2_Horses_BelgianHorse_BlondChestnutBelgianHorse_1-3145-360.jpg',
  'Kentucky Saddler': 'https://www.gtabase.com/igallery/3101-3200/RDR2_Horses_KentuckySaddler_BlackKentuckySaddler_1-3161-360.jpg',
  Morgan: 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_Morgan_Horse-2543-1600.jpg',
  Shire: 'https://www.gtabase.com/igallery/3101-3200/RDR2_Horses_ShireHorse_DarkBayShireHorse_1-3193-360.jpg',
  'Suffolk Punch': 'https://www.gtabase.com/igallery/3101-3200/RDR2_Horses_SuffolkPunchHorse_SorrelSuffolkPunchHorse_2-3200-360.jpg',
  'Tennessee Walker': 'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_TennesseeWalker_Horse-2547-1600.jpg',
};

function galleryBucket(assetId: number): string {
  const start = Math.floor((assetId - 1) / 100) * 100 + 1;
  return `${start}-${start + 99}`;
}

function cigaretteHorseUrl(assetId: number, suffix: string): string {
  return `https://www.gtabase.com/igallery/${galleryBucket(assetId)}/RDR2_CigaretteCards_Horses_${suffix}-${assetId}-1920.jpg`;
}

export function horseMedia(entity: CatalogEntity): ManifestMediaEntry | null {
  if (entity.category !== 'horse') return null;
  const card = CARD_HORSES[entity.name];
  const direct = BREED_IMAGES[entity.name];
  const url = card ? cigaretteHorseUrl(card.assetId, card.suffix) : direct;
  if (!url) return null;
  return {
    url,
    source: 'official-game',
    orientation: card ? 'landscape' : 'landscape',
    fit: 'contain',
  };
}
