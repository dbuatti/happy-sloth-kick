export interface Meal {
  id: string;
  user_id: string;
  meal_date: string; // YYYY-MM-DD
  meal_type: string; // e.g., 'breakfast', 'lunch', 'dinner', 'snack', 'other'
  name: string;
  notes: string | null;
  has_ingredients: boolean;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}