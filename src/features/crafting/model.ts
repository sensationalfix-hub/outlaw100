import type { CatalogCriterion, CatalogRecipe } from '../../lib/catalog/types.ts';
import type { ProgressSnapshot } from '../progress/types.ts';

export type RecipeRequirementState = CatalogRecipe['requirements'][number] & {
  have: number;
  missing: number;
  ready: boolean;
};

export type RecipeState = {
  requirements: RecipeRequirementState[];
  materialsReady: boolean;
  craftedCriterion: CatalogCriterion | null;
  crafted: boolean;
};

export function buildRecipeState(
  recipe: CatalogRecipe,
  criteria: CatalogCriterion[],
  progress: Pick<ProgressSnapshot, 'criteria' | 'inventory'>,
): RecipeState {
  const requirements = recipe.requirements.map((requirement) => {
    const materialId = requirement.materialId ?? '';
    const have = materialId ? Math.max(0, Number(progress.inventory[materialId] ?? 0)) : 0;
    const missing = Math.max(0, requirement.quantity - have);
    return { ...requirement, have, missing, ready: missing === 0 };
  });
  const craftedCriterion = criteria.find((criterion) => criterion.key === 'crafted') ?? null;
  return {
    requirements,
    materialsReady: requirements.every((requirement) => requirement.ready),
    craftedCriterion,
    crafted: craftedCriterion ? progress.criteria[craftedCriterion.id] === 'completed' : false,
  };
}
