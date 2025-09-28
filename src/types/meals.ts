export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface Meal {
  id: string;
  user_id: string;
  meal_date: string; // YYYY-MM-DD
  meal_type: MealType;
  name: string;
  notes: string | null;
  has_ingredients: boolean;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type NewMealData = Omit<Meal, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateMealData = Partial<NewMealData>;