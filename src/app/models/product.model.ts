export interface NutritionInfo {
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Product {
  id: string;
  sellerId: string;
  businessId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  nutrition: NutritionInfo;
  stock: number;
  isAvailable: boolean;
  isDisabled: boolean;
  disableReason?: string;
  /** Archived meals are hidden from customers and from the normal lists, but kept so they can be restored. */
  isArchived?: boolean;
  archivedAt?: Date;
  rating?: number;
  reviewCount?: number;
  /** [NUTRITION-REVIEW] Link where the seller got the nutrition numbers (brand site, USDA, label page...). */
  nutritionSourceUrl?: string;
  /** 'pending' until an admin checks the numbers against the link. Editing the numbers or link sets it back to 'pending'. */
  nutritionStatus?: 'pending' | 'verified' | 'rejected';
  /** Where the numbers come from: a food table, USDA, the product label, or something else. */
  nutritionSourceType?: NutritionSourceType;
  /** Ingredients with weights, e.g. "Chicken breast 150g, brown rice 120g, broccoli 80g". */
  ingredients?: string;
  /** Photo evidence (label or screenshot of the reference), stored as a small data URL. */
  nutritionEvidenceUrl?: string;
  nutritionReviewNote?: string;
  nutritionReviewedAt?: Date | string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
  isActive: boolean;
}

/** [NUTRITION-PROOF] The kinds of reference a seller can pick. */
export type NutritionSourceType = 'dost_fnri' | 'usda' | 'product_label' | 'other';

export const NUTRITION_SOURCES: { value: NutritionSourceType; label: string; needsLink: boolean }[] = [
  { value: 'dost_fnri', label: 'DOST-FNRI Philippine Food Composition Table', needsLink: true },
  { value: 'usda', label: 'USDA FoodData Central', needsLink: true },
  { value: 'product_label', label: 'Product nutrition label', needsLink: false },
  { value: 'other', label: 'Other (explain in ingredients)', needsLink: false },
];

export function nutritionSourceLabel(type?: string): string {
  return NUTRITION_SOURCES.find((s) => s.value === type)?.label || 'Not stated (older meal)';
}
