import type { AppView } from '@/components/app-shell/nav';
import type { CatalogEntity } from '@/lib/catalog/types';

export type EntityViewConfig = {
  title: string;
  kicker: string;
  description: string;
  categories: string[];
  legendary?: boolean;
};

export const ENTITY_VIEW_CONFIGS: Partial<Record<AppView, EntityViewConfig>> = {
  story: { title: 'Historia', kicker: 'MISIONES', description: 'Nodos de historia preservados del HTML, con traducción española y objetivos de medalla cuando la fuente los contiene.', categories: ['story_mission_legacy'] },
  strangers: { title: 'Forasteros', kicker: 'MISIONES SECUNDARIAS', description: 'Cadenas y misiones de forasteros conservadas como entidades canónicas.', categories: ['stranger'] },
  camp: { title: 'Campamento', kicker: 'VIDA DE LA BANDA', description: 'Contenido de campamento, separado del progreso de historia.', categories: ['camp_upgrade'] },
  animals: { title: 'Animales', kicker: 'COMPENDIO', description: 'Cada especie mantiene sus criterios independientes: estudiar, rastrear, abatir, despellejar y los que correspondan.', categories: ['animal'], legendary: false },
  legendary: { title: 'Animales legendarios', kicker: 'CAZA MAYOR', description: 'Fauna legendaria dentro del mismo modelo canónico, separada de las especies normales.', categories: ['animal'], legendary: true },
  fish: { title: 'Peces', kicker: 'PESCA', description: 'Especies, cebo, localización, clima y criterios específicos del Excel.', categories: ['fish'] },
  plants: { title: 'Plantas', kicker: 'HERBARIO', description: 'Plantas, orquídeas y criterios de recolección, receta, cata y Herbalist cuando la fuente lo exige.', categories: ['plant'] },
  horses: { title: 'Caballos y pelajes', kicker: 'ESTABLO', description: 'Razas, pelajes y criterios independientes, sin reducir el establo a un check genérico.', categories: ['horse', 'horse_coat'] },
  weapons: { title: 'Armas', kicker: 'ARSENAL', description: 'Armas, localizaciones y condiciones de adquisición.', categories: ['weapon'] },
  equipment: { title: 'Equipo', kicker: 'INVENTARIO', description: 'Equipo general, equipo de armas, equipo reforzado y talismanes.', categories: ['equipment', 'weapon_equipment', 'reinforced_equipment', 'horse_equipment', 'talisman_trinket'] },
  cards: { title: 'Cromos', kicker: 'COLECCIONES', description: 'Los 144 cromos, sus sets, números, localización y criterio individual.', categories: ['cigarette_card'] },
  outfits: { title: 'Atuendos', kicker: 'TRAMPERO Y TIENDAS', description: 'Atuendos, piezas y ropa con sus requisitos y materiales cuando constan en el Excel.', categories: ['outfit', 'outfit_item', 'clothing'] },
  satchels: { title: 'Zurrones', kicker: 'PEARSON', description: 'Zurrones, materiales necesarios e independencia entre tener materiales y haber fabricado la pieza.', categories: ['satchel'] },
  saddles: { title: 'Sillas', kicker: 'TRAMPERO', description: 'Sillas y requisitos de fabricación preservados desde el Excel.', categories: ['saddle'] },
  camp_upgrades: { title: 'Mejoras del campamento', kicker: 'CAMPAMENTO', description: 'Mejoras y materiales del campamento con sus dependencias de crafteo.', categories: ['camp_upgrade'] },
  challenges: { title: 'Desafíos', kicker: '9 × 10', description: 'Los nueve bloques de desafío conservan sus diez rangos independientes.', categories: ['challenge'] },
  collectibles: { title: 'Coleccionables', kicker: 'BARRIDO DEL MAPA', description: 'Vista conjunta para barridos de coleccionables y objetos de exploración.', categories: ['cigarette_card', 'document', 'point_of_interest', 'shack', 'valuable', 'secret'] },
  points: { title: 'Puntos de interés', kicker: 'EXPLORACIÓN', description: 'Puntos de interés y cabañas del Archivo con ficha canónica y acceso al mapa cuando existe marcador.', categories: ['point_of_interest', 'shack'] },
  encounters: { title: 'Encuentros', kicker: 'MUNDO ABIERTO', description: 'Encuentros aleatorios, recompensas, guaridas y robos catalogados por el HTML.', categories: ['encounter', 'bounty', 'robbery', 'gang_hideout'] },
  secrets: { title: 'Secretos', kicker: 'LO QUE NO TE CUENTAN', description: 'Secretos y cadenas especiales preservadas del HTML.', categories: ['secret'] },
  documents: { title: 'Documentos y objetos únicos', kicker: 'ARCHIVO', description: 'Documentos, objetos de valor y piezas únicas del Archivo.', categories: ['document', 'valuable'] },
  achievements: { title: 'Logros y trofeos', kicker: 'CIERRE', description: 'Requisitos de finalización y objetivos del 100%.', categories: ['completion_requirement'] },
};

export function appViewForEntity(entity: CatalogEntity): AppView {
  if (entity.category === 'story_mission_legacy') return 'story';
  if (entity.category === 'stranger') return 'strangers';
  if (entity.category === 'camp_upgrade') return 'camp_upgrades';
  if (entity.category === 'animal') return entity.metadata?.legendary ? 'legendary' : 'animals';
  if (entity.category === 'fish') return 'fish';
  if (entity.category === 'plant') return 'plants';
  if (['horse', 'horse_coat'].includes(entity.category)) return 'horses';
  if (entity.category === 'weapon') return 'weapons';
  if (entity.category === 'cigarette_card') return 'cards';
  if (['outfit', 'outfit_item', 'clothing'].includes(entity.category)) return 'outfits';
  if (entity.category === 'satchel') return 'satchels';
  if (entity.category === 'saddle') return 'saddles';
  if (['equipment', 'weapon_equipment', 'reinforced_equipment', 'horse_equipment', 'talisman_trinket'].includes(entity.category)) return 'equipment';
  if (['point_of_interest', 'shack'].includes(entity.category)) return 'points';
  if (['encounter', 'bounty', 'robbery', 'gang_hideout'].includes(entity.category)) return 'encounters';
  if (entity.category === 'secret') return 'secrets';
  if (['document', 'valuable'].includes(entity.category)) return 'documents';
  if (entity.category === 'challenge') return 'challenges';
  if (entity.category === 'completion_requirement') return 'achievements';
  return 'archive';
}
