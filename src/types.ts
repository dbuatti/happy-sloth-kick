// src/types.ts

export interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed';
  created_at: string;
  user_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string | null; // Allow null
  notes?: string;
  remind_at?: string | null; // Allow null
  section_id?: string | null; // Allow null
  order?: number;
  parent_task_id?: string | null;
  recurring_type?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  original_task_id?: string;
  category?: string | null; // Allow null
  link?: string;
  image_url?: string;
  updated_at?: string;
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
  order?: number;
  created_at?: string;
  include_in_focus_mode?: boolean;
}

export interface DoTodayOffLogEntry {
  id: string;
  user_id: string;
  task_id: string;
  off_date: string;
  created_at?: string;
}