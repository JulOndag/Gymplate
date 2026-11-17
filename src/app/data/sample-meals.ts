export interface SampleMeal {
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  nutrition: { servingSize: string; calories: number; protein: number; carbs: number; fat: number };
  stock: number;
}

export const DEMO_MEALS: SampleMeal[] = [
  {
    name: 'Grilled Chicken Power Bowl',
    description:
      'Herb-marinated grilled chicken breast served over brown rice with roasted sweet potatoes, steamed broccoli, and a tangy lemon-tahini drizzle. A perfectly balanced meal to fuel your workouts.',
    category: 'Protein Bowls',
    price: 285,
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    nutrition: { servingSize: '1 bowl (400g)', calories: 450, protein: 42, carbs: 35, fat: 12 },
    stock: 25,
  },
  {
    name: 'Salmon Teriyaki Bowl',
    description:
      'Pan-seared Atlantic salmon glazed with house-made teriyaki sauce, served on a bed of jasmine rice with edamame, pickled ginger, cucumber, and sesame seeds.',
    category: 'Protein Bowls',
    price: 350,
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop',
    nutrition: { servingSize: '1 bowl (420g)', calories: 520, protein: 38, carbs: 42, fat: 18 },
    stock: 15,
  },
  {
    name: 'Turkey Avocado Wrap',
    description:
      'Sliced oven-roasted turkey breast with creamy avocado, baby spinach, tomatoes, red onion, and a light chipotle mayo wrapped in a whole-wheat tortilla.',
    category: 'Wraps',
    price: 240,
    imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop',
    nutrition: { servingSize: '1 wrap (280g)', calories: 380, protein: 32, carbs: 28, fat: 14 },
    stock: 30,
  },
  {
    name: 'Greek Protein Salad',
    description:
      'Crisp romaine lettuce tossed with grilled chicken, kalamata olives, cherry tomatoes, cucumber, red onion, feta cheese, and a zesty Greek vinaigrette.',
    category: 'Salads',
    price: 250,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    nutrition: { servingSize: '1 salad (350g)', calories: 320, protein: 28, carbs: 18, fat: 16 },
    stock: 20,
  },
  {
    name: 'Berry Protein Smoothie',
    description:
      'A refreshing blend of mixed berries, banana, vanilla whey protein, Greek yogurt, and almond milk. The perfect post-workout recovery drink.',
    category: 'Smoothies',
    price: 180,
    imageUrl: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=300&fit=crop',
    nutrition: { servingSize: '1 glass (450ml)', calories: 280, protein: 25, carbs: 32, fat: 4 },
    stock: 40,
  },
  {
    name: 'Beef & Quinoa Bowl',
    description:
      'Tender grass-fed beef strips stir-fried with bell peppers and onions, served over fluffy quinoa with a side of roasted vegetables and chimichurri sauce.',
    category: 'Protein Bowls',
    price: 320,
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    nutrition: { servingSize: '1 bowl (430g)', calories: 580, protein: 45, carbs: 48, fat: 16 },
    stock: 18,
  },
  {
    name: 'Egg White & Veggie Wrap',
    description:
      'Fluffy egg whites scrambled with sautéed spinach, mushrooms, bell peppers, and a sprinkle of low-fat mozzarella, all wrapped in a sun-dried tomato tortilla.',
    category: 'Wraps',
    price: 210,
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
    nutrition: { servingSize: '1 wrap (260g)', calories: 290, protein: 24, carbs: 22, fat: 8 },
    stock: 35,
  },
  {
    name: 'Asian Chicken Salad',
    description:
      'Shredded sesame-ginger chicken over a vibrant mix of Napa cabbage, shredded carrots, edamame, mandarin oranges, crispy wontons, and a toasted sesame dressing.',
    category: 'Salads',
    price: 260,
    imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop',
    nutrition: { servingSize: '1 salad (370g)', calories: 350, protein: 30, carbs: 22, fat: 14 },
    stock: 22,
  },
  {
    name: 'Chocolate Peanut Butter Smoothie',
    description:
      'Rich chocolate whey protein blended with natural peanut butter, banana, oats, and almond milk. A decadent-tasting smoothie that packs a serious protein punch.',
    category: 'Smoothies',
    price: 190,
    imageUrl: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=400&h=300&fit=crop',
    nutrition: { servingSize: '1 glass (450ml)', calories: 340, protein: 28, carbs: 36, fat: 8 },
    stock: 30,
  },
  {
    name: 'Quinoa Veggie Bowl',
    description:
      'A hearty plant-based bowl with tri-color quinoa, roasted chickpeas, sweet potato, avocado, kale, cherry tomatoes, and a creamy turmeric-tahini dressing.',
    category: 'Protein Bowls',
    price: 265,
    imageUrl: 'https://images.unsplash.com/photo-1543339308-d6a60ac89b00?w=400&h=300&fit=crop',
    nutrition: { servingSize: '1 bowl (400g)', calories: 400, protein: 18, carbs: 52, fat: 12 },
    stock: 0,
  },
];

export const EXTRA_MEALS: SampleMeal[] = [
  {
    name: 'Grilled Chicken Breast with Brown Rice',
    description: 'Herb-marinated grilled chicken breast, brown rice and steamed broccoli.',
    category: 'Protein Bowls',
    price: 185,
    imageUrl: '',
    nutrition: { servingSize: '1 bowl (400g)', calories: 520, protein: 45, carbs: 52, fat: 12 },
    stock: 20,
  },
  {
    name: 'Lean Beef Tapa Rice Bowl',
    description: 'Lean beef tapa, garlic brown rice, sliced tomato and a side of cucumber.',
    category: 'Protein Bowls',
    price: 195,
    imageUrl: '',
    nutrition: { servingSize: '1 bowl (380g)', calories: 560, protein: 42, carbs: 58, fat: 17 },
    stock: 20,
  },
  {
    name: 'Baked Salmon with Quinoa',
    description: 'Oven-baked salmon fillet over quinoa with roasted asparagus.',
    category: 'Protein Bowls',
    price: 285,
    imageUrl: '',
    nutrition: { servingSize: '1 plate (360g)', calories: 580, protein: 40, carbs: 38, fat: 28 },
    stock: 20,
  },
  {
    name: 'Tuna Egg White Salad',
    description:
      'Canned tuna, boiled egg whites, mixed greens, cherry tomatoes, olive oil dressing.',
    category: 'Salads',
    price: 165,
    imageUrl: '',
    nutrition: { servingSize: '1 bowl (320g)', calories: 310, protein: 38, carbs: 12, fat: 12 },
    stock: 20,
  },
  {
    name: 'Turkey Breast Wrap',
    description: 'Whole wheat wrap with sliced turkey breast, lettuce, tomato, light yogurt sauce.',
    category: 'Wraps',
    price: 150,
    imageUrl: '',
    nutrition: { servingSize: '1 wrap (280g)', calories: 430, protein: 32, carbs: 44, fat: 13 },
    stock: 20,
  },
  {
    name: 'Egg White Veggie Omelette',
    description:
      'Three egg whites, spinach, mushrooms and bell peppers with one slice of whole wheat toast.',
    category: 'Meal Prep',
    price: 120,
    imageUrl: '',
    nutrition: { servingSize: '1 plate (260g)', calories: 290, protein: 28, carbs: 24, fat: 8 },
    stock: 20,
  },
  {
    name: 'Overnight Oats with Berries',
    description: 'Rolled oats, low-fat milk, chia seeds, mixed berries and a drizzle of honey.',
    category: 'Meal Prep',
    price: 110,
    imageUrl: '',
    nutrition: { servingSize: '1 jar (300g)', calories: 360, protein: 15, carbs: 58, fat: 8 },
    stock: 20,
  },
  {
    name: 'Tofu Veggie Stir-Fry',
    description:
      'Firm tofu, broccoli, carrots and snap peas in light soy-garlic sauce with brown rice.',
    category: 'Protein Bowls',
    price: 140,
    imageUrl: '',
    nutrition: { servingSize: '1 bowl (400g)', calories: 440, protein: 24, carbs: 54, fat: 14 },
    stock: 20,
  },
  {
    name: 'Chickpea Quinoa Power Bowl',
    description: 'Chickpeas, quinoa, roasted sweet potato, kale and tahini dressing.',
    category: 'Protein Bowls',
    price: 160,
    imageUrl: '',
    nutrition: { servingSize: '1 bowl (420g)', calories: 520, protein: 20, carbs: 70, fat: 18 },
    stock: 20,
  },
  {
    name: 'Keto Chicken Caesar (No Croutons)',
    description: 'Grilled chicken, romaine, parmesan and light Caesar dressing, no croutons.',
    category: 'Salads',
    price: 175,
    imageUrl: '',
    nutrition: { servingSize: '1 bowl (340g)', calories: 380, protein: 40, carbs: 6, fat: 21 },
    stock: 20,
  },
  {
    name: 'Greek Yogurt Protein Parfait',
    description: 'Plain Greek yogurt, granola, banana slices and a scoop of peanut butter.',
    category: 'Snacks',
    price: 95,
    imageUrl: '',
    nutrition: { servingSize: '1 cup (250g)', calories: 330, protein: 25, carbs: 36, fat: 10 },
    stock: 20,
  },
  {
    name: 'Banana Peanut Protein Smoothie',
    description: 'Banana, peanut butter, whey protein and low-fat milk, blended.',
    category: 'Smoothies',
    price: 100,
    imageUrl: '',
    nutrition: { servingSize: '1 bottle (400ml)', calories: 380, protein: 30, carbs: 42, fat: 9 },
    stock: 20,
  },
  {
    name: 'Sweet Potato Chicken Hash',
    description:
      'Diced sweet potato, shredded chicken, onion and bell pepper pan-seared with olive oil.',
    category: 'Meal Prep',
    price: 155,
    imageUrl: '',
    nutrition: { servingSize: '1 plate (350g)', calories: 480, protein: 38, carbs: 48, fat: 14 },
    stock: 20,
  },
  {
    name: 'Shrimp Garlic Zucchini Noodles',
    description:
      'Sauteed shrimp in garlic and olive oil over zucchini noodles with cherry tomatoes.',
    category: 'Meal Prep',
    price: 210,
    imageUrl: '',
    nutrition: { servingSize: '1 plate (330g)', calories: 330, protein: 34, carbs: 14, fat: 15 },
    stock: 20,
  },
];
