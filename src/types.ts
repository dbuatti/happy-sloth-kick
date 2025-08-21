export interface Task {
  id: string;
  description: string;
  status: "to-do" | "completed" | "skipped" | "archived";
  created_at: string;
  user_id: string;
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number;
  parent_task_id: string | null;
  recurring_type: "none" | "daily" | "weekly" | "monthly";
  original_task_id: string | null;
  category: string | null;
  link: string | null;
  image_url: string | null;
  updated_at: string;
}

export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

export interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
  created_at: string;
  include_in_focus_mode: boolean;
}