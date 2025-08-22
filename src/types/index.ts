export interface Task {
  id: string;
  user_id: string;
  description: string;
  status: "to-do" | "completed";
  created_at: string;
  priority: "none" | "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number;
  parent_task_id: string | null;
  recurring_type: "none" | "daily" | "weekly" | "monthly" | "yearly";
  original_task_id: string | null;
  category: string | null;
  link: string | null;
  image_url: string | null;
  updated_at: string;
}

export interface TaskCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TaskSection {
  id: string;
  user_id: string;
  name: string;
  order: number;
  created_at: string;
  include_in_focus_mode: boolean;
}

export interface DoTodayOffLogEntry {
  id: string;
  user_id: string;
  task_id: string;
  off_date: string;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  project_tracker_title: string;
  focused_task_id: string | null;
  meditation_notes: string | null;
  dashboard_layout: any | null; // Consider a more specific type if structure is known
  visible_pages: any | null; // Consider a more specific type if structure is known
  schedule_show_focus_tasks_only: boolean;
  future_tasks_days_visible: number;
}