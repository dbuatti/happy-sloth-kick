export interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'in-progress' | 'completed';
  created_at: string;
  user_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number;
  parent_task_id: string | null;
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  original_task_id: string | null;
  category: string | null; // This will be the category ID
  link: string | null;
  image_url: string | null;
  updated_at: string;
  category_color?: string; // Added for display purposes, might be joined from TaskCategory
}

export interface TaskSection {
  id: string;
  name: string;
  user_id: string;
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