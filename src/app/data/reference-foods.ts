/**
 * [NUTRITION-REFERENCE] Foods the app can check by itself.
 * Values are per 100 g of the COOKED food, from USDA FoodData Central (SR Legacy).
 * To support another food, add a line here with its FDC ID and the 4 USDA numbers.
 * Foods that are not listed are not auto-checked; the admin still verifies them.
 */
export interface ReferenceFood {
  name: string;
  fdcId: string;
  /** every word group that must appear in the ingredient text, e.g. ['chicken'] */
  match: RegExp;
  /** words that make the ingredient a different food (fried, skin, raw ...) */
  exclude: RegExp;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

const NOT_PLAIN =
  /\b(raw|uncooked|dry|fried|breaded|crispy|nugget|battered|canned|smoked|teriyaki|sauce|oil|butter)\b/i;

export const REFERENCE_FOODS: ReferenceFood[] = [
  {
    name: 'Chicken breast, roasted, meat only',
    fdcId: '171477',
    match: /chicken\s+breast|chicken\b(?!.*(thigh|wing|drumstick|leg|skin))/i,
    exclude: NOT_PLAIN,
    kcal: 165,
    protein: 31.02,
    carbs: 0,
    fat: 3.57,
  },
  {
    name: 'Brown rice, medium-grain, cooked',
    fdcId: '168875',
    match: /brown\s+rice/i,
    exclude: NOT_PLAIN,
    kcal: 112,
    protein: 2.32,
    carbs: 23.51,
    fat: 0.83,
  },
  {
    name: 'Broccoli, boiled, drained, no salt',
    fdcId: '169967',
    match: /broccoli/i,
    exclude: NOT_PLAIN,
    kcal: 35,
    protein: 2.38,
    carbs: 7.18,
    fat: 0.41,
  },
  {
    name: 'Salmon, Atlantic, farmed, cooked, dry heat',
    fdcId: '175168',
    match: /salmon/i,
    exclude: NOT_PLAIN,
    kcal: 206,
    protein: 22.1,
    carbs: 0,
    fat: 12.35,
  },
];
