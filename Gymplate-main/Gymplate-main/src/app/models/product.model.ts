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
