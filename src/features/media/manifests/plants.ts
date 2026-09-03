import type { ManifestMediaEntry } from '../types.ts';

const QBR_IMAGE_ROOT = 'https://raw.githubusercontent.com/qbcore-redm/qbr-inventory/main/html/images/';

const PLANT_FILES: Record<string, string> = {
  'Alaskan Ginseng': 'consumable_herb_alaskan_ginseng.png',
  'American Ginseng': 'consumable_herb_american_ginseng.png',
  'Bay Bolete': 'consumable_herb_bay_bolete.png',
  Blackcurrant: 'consumable_herb_black_currant.png',
  Blackberry: 'consumable_herb_black_berry.png',
  'Burdock Root': 'consumable_herb_burdock_root.png',
  Chanterelles: 'consumable_herb_chanterelles.png',
  'Common Bulrush': 'consumable_herb_common_bulrush.png',
  'Creeping Thyme': 'consumable_herb_creeping_thyme.png',
  'Desert Sage': 'consumable_herb_desert_sage.png',
  'English Mace': 'consumable_herb_english_mace.png',
  'Evergreen Huckleberry': 'consumable_herb_evergreen_huckleberry.png',
  'Golden Currant': 'consumable_herb_golden_currant.png',
  'Hummingbird Sage': 'consumable_herb_hummingbird_sage.png',
  'Indian Tobacco': 'consumable_herb_indian_tobacco.png',
  Milkweed: 'consumable_herb_milkweed.png',
  'Oleander Sage': 'consumable_herb_oleander_sage.png',
  Oregano: 'consumable_herb_oregano.png',
  'Parasol Mushroom': 'consumable_herb_parasol_mushroom.png',
  'Prairie Poppy': 'consumable_herb_prairie_poppy.png',
  "Ram's Head": 'consumable_herb_rams_head.png',
  'Red Raspberry': 'consumable_herb_red_raspberry.png',
  'Red Sage': 'consumable_herb_red_sage.png',
  'Vanilla Flower': 'consumable_herb_vanilla_flower.png',
  'Violet Snowdrops': 'consumable_herb_violet_snowdrop.png',
  'Wild Carrot': 'consumable_herb_wild_carrots.png',
  'Wild Feverfew': 'consumable_herb_wild_feverfew.png',
  'Wild Mint': 'consumable_herb_wild_mint.png',
  'Wintergreen Berry': 'consumable_herb_wintergreen_berry.png',
  Yarrow: 'consumable_herb_yarrow.png',
};

const ORCHID_MEDIA: Record<string, string> = {
  "Acuna's Star Orchid": 'https://img.atwiki.jp/rdr2jp/attach/1054/2076/Acuna%27s%20Star%20Orchid.png',
  'Cigar Orchid': 'https://img.atwiki.jp/rdr2jp/attach/1054/2077/Cigar%20Orchid.png',
  'Clamshell Orchid': 'https://img.atwiki.jp/rdr2jp/attach/1054/2078/Clamshell%20Orchid.png',
  "Dragon's Mouth Orchid": 'https://img.atwiki.jp/rdr2jp/attach/1054/2079/Dragon%27s%20Mouth%20Orchid.png',
  'Ghost Orchid': 'https://img.atwiki.jp/rdr2jp/attach/1054/2058/Ghost%20Orchid.png',
  'Lady of the Night Orchid': 'https://img.atwiki.jp/rdr2jp/attach/1054/2062/Lady%20of%20the%20Night%20Orchid.png',
  'Lady Slipper Orchid': 'https://img.atwiki.jp/rdr2jp/attach/1054/2063/Lady%20Slipper%20Orchid.png',
  'Moccasin Flower Orchid': 'https://img.atwiki.jp/rdr2jp/attach/1054/2065/Moccasin%20Flower%20Orchid.png',
  'Night Scented Orchid': 'https://img.atwiki.jp/rdr2jp/attach/1054/2080/Night%20Scented%20Orchid.png',
  "Queen's Orchid": 'https://img.atwiki.jp/rdr2jp/attach/1054/2047/Queen%27s%20Orchid.png',
  'Rat Tail Orchid': 'https://img.atwiki.jp/rdr2jp/attach/1054/2049/Rat%20Tail%20Orchid.png',
  "Sparrow's Egg Orchid": 'https://img.atwiki.jp/rdr2jp/attach/1054/2052/Sparrow%27s%20Egg%20Orchid.png',
  'Spider Orchid': 'https://img.atwiki.jp/rdr2jp/attach/1054/2045/Spider%20Orchid.png',
};

export function plantMedia(name: string): ManifestMediaEntry | null {
  const orchidUrl = ORCHID_MEDIA[name];
  if (orchidUrl) {
    return {
      url: orchidUrl,
      source: 'curated-external',
      orientation: 'landscape',
      fit: 'contain',
    };
  }

  const filename = PLANT_FILES[name];
  if (!filename) return null;
  return {
    url: `${QBR_IMAGE_ROOT}${filename}`,
    source: 'official-game',
    orientation: 'square',
    fit: 'contain',
  };
}
