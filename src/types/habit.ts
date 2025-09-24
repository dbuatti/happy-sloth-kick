export interface HabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  log_date: string; // YYYY-MM-DD
  is_completed: boolean;
  created_at: string;
  value_recorded: number | null;
}