// Placeholder for common types
export interface Task {
  id: string;
  description: string;
  status: "to-do" | "completed";
  due_date?: string | null;
  remind_at?: string | null;
  category?: string | null;
  priority: "none" | "low" | "medium" | "high" | "urgent";
  section_id?: string | null;
  recurring_type: "none" | "daily" | "weekly" | "monthly" | "yearly";
  link?: string | null;
  image_url?: string | null;
  notes?: string | null;
  parent_task_id?: string | null;
  original_task_id?: string | null;
  user_id: string;
  created_at: string;
}

export interface TaskCategory {
  id: string;
  user_id: string;
  name: string;
  color?: string | null;
  created_at: string;
}

export interface TaskSection {
  id: string;
  user_id: string;
  name: string;
  order_index: number;
  include_in_focus_mode: boolean;
  created_at: string;
}

export interface DoTodayOffLogEntry {
  id: string;
  user_id: string;
  task_id: string;
  off_date: string; // YYYY-MM-DD
  created_at: string;
}