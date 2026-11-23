import { Product, NUTRITION_SOURCES } from '../../models/product.model';

export interface ProofErrors {
  source?: string;
  link?: string;
  ingredients?: string;
  evidence?: string;
  calories?: string;
  confirm?: string;
}

/** Calories a meal should have from its macros (protein 4, carbs 4, fat 9 per gram). */
export function caloriesFromMacros(n: { protein: number; carbs: number; fat: number }): number {
  return Math.round(4 * (+n.protein || 0) + 4 * (+n.carbs || 0) + 9 * (+n.fat || 0));
}

/**
 * [NUTRITION-PROOF] Checks everything the seller must give so the admin (and customers) can trust the numbers.
 * Returns an object of messages. An empty object means everything is fine.
 */
export function validateNutritionProof(p: Product, confirmed: boolean): ProofErrors {
  const e: ProofErrors = {};
  const src = NUTRITION_SOURCES.find((s) => s.value === p.nutritionSourceType);
  if (!src) e.source = 'Choose where the nutrition values come from.';

  const link = (p.nutritionSourceUrl || '').trim();
  const linkOk = /^https?:\/\/\S+\.\S+/i.test(link);
  if (src?.needsLink && !linkOk) {
    e.link = 'Add the link to the exact page (it must start with https://).';
  } else if (link && !linkOk) {
    e.link = 'That link is not valid. It must start with https://';
  }

  const ing = (p.ingredients || '').trim();
  if (ing.length < 5)
    e.ingredients =
      'List the ingredients with their weights (for example: Chicken 150g, rice 120g).';
  if (ing.length > 1000) e.ingredients = 'Ingredients are too long (1000 characters max).';

  if (!p.nutritionEvidenceUrl)
    e.evidence = 'Upload a photo of the label or a screenshot of the reference as evidence.';

  const entered = +p.nutrition.calories || 0;
  const calc = caloriesFromMacros(p.nutrition);
  if (Math.abs(entered - calc) > Math.max(40, calc * 0.15)) {
    e.calories = `These values don't add up. Your macros give about ${calc} kcal, but you entered ${entered}. Please check.`;
  }

  if (!confirmed) e.confirm = 'Please confirm that the values are accurate.';
  return e;
}

export function hasProofErrors(e: ProofErrors): boolean {
  return Object.keys(e).length > 0;
}
