export type TaskStatus = 'to-do' | 'in-progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RecurringType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Task {
  id: string;
  user_id: string;
  description: string;
  status: TaskStatus;
  created_at: string;
  priority: TaskPriority;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number;
  parent_task_id: string | null;
  recurring_type: RecurringType;
  original_task_id: string | null;
  category: string | null; // This will be the category ID
  category_color?: string; // Added for display purposes, might be joined from task_categories
  link: string | null;
  image_url: string | null;
  updated_at: string;
}

export interface TaskSection {
  id: string;
  user_id: string;
  name: string;
  order: number | null;
  created_at: string;
  include_in_focus_mode: boolean;
}

export interface TaskCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}