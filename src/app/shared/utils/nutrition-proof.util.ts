import { Product, NUTRITION_SOURCES } from '../../models/product.model';
import { REFERENCE_FOODS } from '../../data/reference-foods';

export interface ProofErrors {
  source?: string;
  link?: string;
  ingredients?: string;
  evidence?: string;
  calories?: string;
  /** [NUTRITION-CHECK] serving size is missing, has no weight, or is not realistic */
  serving?: string;
  /** [NUTRITION-CHECK] weights or macros that cannot be true together */
  weight?: string;
  /** [NUTRITION-REFERENCE] the macros do not match what the ingredients give in the USDA table */
  reference?: string;
  confirm?: string;
}

/**
 * Adds up the nutrition of the ingredients the app knows (see reference-foods.ts).
 * Returns the totals, how many ingredient lines it understood, and how many it could not check.
 */
export function expectedFromIngredients(text: string): {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  known: number;
  unknown: number;
  grams: number;
} {
  const out = { kcal: 0, protein: 0, carbs: 0, fat: 0, known: 0, unknown: 0, grams: 0 };
  for (const part of (text || '').split(/[,;\n+]|\band\b/i)) {
    const w = findWeights(part);
    if (!w.length) continue;
    const food = REFERENCE_FOODS.find((f) => f.match.test(part) && !f.exclude.test(part));
    if (!food) {
      out.unknown++;
      continue;
    }
    const r = w[0].grams / 100;
    out.kcal += food.kcal * r;
    out.protein += food.protein * r;
    out.carbs += food.carbs * r;
    out.fat += food.fat * r;
    out.grams += w[0].grams;
    out.known++;
  }
  return out;
}

/** Turns "400g", "1.2 kg", "250 ml" into grams. ml is treated as 1 g (good enough for a sanity check). */
function toGrams(value: number, unit: string): number {
  const u = unit.toLowerCase();
  return u === 'kg' || u === 'l' ? value * 1000 : value;
}

/** Finds every weight in a text, e.g. "Chicken 150g, rice 1.2kg" -> [{grams:150,text:'150g'}, ...]. */
export function findWeights(text: string): { grams: number; text: string }[] {
  const out: { grams: number; text: string }[] = [];
  const re = /(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text || ''))) {
    out.push({ grams: toGrams(parseFloat(m[1].replace(',', '.')), m[2]), text: m[0] });
  }
  return out;
}

/** The weight of one serving, read from text such as "1 bowl (400g)". Returns 0 when there is none. */
export function servingGrams(servingSize: string): number {
  const w = findWeights(servingSize);
  return w.length ? w[w.length - 1].grams : 0;
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
  } else if (linkOk) {
    // [NUTRITION-CHECK] the link must really belong to the reference the seller picked
    const host = link
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      .toLowerCase();
    if (p.nutritionSourceType === 'usda' && !host.endsWith('usda.gov'))
      e.link = 'You chose USDA FoodData Central, so the link must be on fdc.nal.usda.gov.';
    if (p.nutritionSourceType === 'dost_fnri' && !host.endsWith('dost.gov.ph'))
      e.link = 'You chose DOST-FNRI, so the link must be on i.fnri.dost.gov.ph.';
  }

  const ing = (p.ingredients || '').trim();
  if (ing.length < 5)
    e.ingredients =
      'List the ingredients with their weights (for example: Chicken 150g, rice 120g).';
  if (ing.length > 1000) e.ingredients = 'Ingredients are too long (1000 characters max).';

  // [NUTRITION-CHECK] every ingredient needs a believable weight, and the total must fit one meal
  if (!e.ingredients) {
    const weights = findWeights(ing);
    const total = weights.reduce((a, w) => a + w.grams, 0);
    const huge = weights.find((w) => w.grams > 1500);
    if (!weights.length) {
      e.ingredients = 'Write a weight for each ingredient, like "Chicken 150g, rice 150g".';
    } else if (huge) {
      e.ingredients = `"${huge.text}" is not realistic for one meal. Check the unit (g, not kg).`;
    } else if (total < 80 || total > 2000) {
      e.ingredients = `The ingredients add up to ${Math.round(total)} g. A single meal should be between 80 g and 2000 g.`;
    }
  }

  // [NUTRITION-CHECK] serving size must have a weight, and agree with the ingredients and macros
  const servText = p.nutrition.servingSize || '';
  const servG = servingGrams(servText);
  // The numbers are for ONE serving, so "2 bowl (400g)" or "3 pieces (300g)" is wrong. Only "1 ..." or just a weight is fine.
  const lead = /^\s*(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)/.exec(servText);
  const leadIsWeight = !!lead && ['g', 'kg', 'ml', 'l'].includes(lead[2].toLowerCase());
  if (lead && !leadIsWeight && parseFloat(lead[1].replace(',', '.')) !== 1) {
    e.serving = `The values must be for 1 serving, but you wrote "${servText.trim()}". Write it as "1 ${lead[2]} (${servG ? Math.round(servG) : 400}g)".`;
  } else if (!servG) {
    e.serving = 'Write the serving size with its weight, for example "1 bowl (400g)".';
  } else if (servG < 50 || servG > 1500) {
    e.serving = `A serving of ${Math.round(servG)} g is not realistic. Use between 50 g and 1500 g.`;
  } else {
    const ingTotal = findWeights(ing).reduce((a, w) => a + w.grams, 0);
    if (!e.ingredients && ingTotal > 0 && (servG < ingTotal * 0.65 || servG > ingTotal * 1.5)) {
      e.serving = `Your serving (${Math.round(servG)} g) does not match your ingredients (${Math.round(ingTotal)} g in total).`;
    }
    const macroG =
      (+p.nutrition.protein || 0) + (+p.nutrition.carbs || 0) + (+p.nutrition.fat || 0);
    if (macroG > servG) {
      e.weight = `Protein + carbs + fat is ${Math.round(macroG)} g, which is more than the serving itself (${Math.round(servG)} g).`;
    } else if ((+p.nutrition.calories || 0) > servG * 9) {
      e.weight =
        'Those calories are impossible for that weight (food cannot have more than 9 kcal per gram).';
    }
  }
  const n = p.nutrition;
  if ([n.calories, n.protein, n.carbs, n.fat].some((v) => !(+v >= 0)) || (+n.calories || 0) <= 0) {
    e.weight = e.weight || 'Calories, protein, carbs and fat must be numbers of 0 or more.';
  }

  if (!p.nutritionEvidenceUrl)
    e.evidence = 'Upload a photo of the label or a screenshot of the reference as evidence.';

  const entered = +p.nutrition.calories || 0;
  const calc = caloriesFromMacros(p.nutrition);
  if (Math.abs(entered - calc) > Math.max(40, calc * 0.15)) {
    e.calories = `These values don't add up. Your macros give about ${calc} kcal, but you entered ${entered}. Please check.`;
  }

  // [NUTRITION-REFERENCE] compare the macros with what the ingredients really give (USDA table)
  if (!e.ingredients) {
    const x = expectedFromIngredients(ing);
    if (x.known > 0) {
      const off = (entered: number, exp: number, minGap: number) =>
        Math.abs(entered - exp) > Math.max(minGap, exp * 0.12);
      const low = (entered: number, exp: number) => entered < exp * 0.88 - 2; // unknown ingredients can only ADD to the totals
      const en = { kcal: +n.calories || 0, p: +n.protein || 0, c: +n.carbs || 0, f: +n.fat || 0 };
      const bad: string[] = [];
      if (x.unknown === 0) {
        if (off(en.p, x.protein, 4))
          bad.push(`protein ${en.p} g (expected about ${x.protein.toFixed(1)} g)`);
        if (off(en.c, x.carbs, 4))
          bad.push(`carbs ${en.c} g (expected about ${x.carbs.toFixed(1)} g)`);
        if (off(en.f, x.fat, 3)) bad.push(`fat ${en.f} g (expected about ${x.fat.toFixed(1)} g)`);
        if (off(en.kcal, x.kcal, 40))
          bad.push(`calories ${en.kcal} (expected about ${Math.round(x.kcal)})`);
      } else {
        if (low(en.p, x.protein))
          bad.push(
            `protein ${en.p} g (the listed foods alone give at least ${x.protein.toFixed(1)} g)`,
          );
        if (low(en.c, x.carbs)) bad.push(`carbs ${en.c} g (at least ${x.carbs.toFixed(1)} g)`);
        if (low(en.f, x.fat)) bad.push(`fat ${en.f} g (at least ${x.fat.toFixed(1)} g)`);
        if (low(en.kcal, x.kcal)) bad.push(`calories ${en.kcal} (at least ${Math.round(x.kcal)})`);
      }
      if (bad.length) {
        e.reference = `These numbers do not match your ingredients in the USDA table (cooked weights): ${bad.join('; ')}. Please correct them.`;
      }
    }
  }

  if (!confirmed) e.confirm = 'Please confirm that the values are accurate.';
  return e;
}

export function hasProofErrors(e: ProofErrors): boolean {
  return Object.keys(e).length > 0;
}
