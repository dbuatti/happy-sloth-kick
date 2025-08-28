export type TaskStatus = 'to-do' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  created_at: string;
  user_id: string;
  description: string | null; // Changed to string | null to match database
  notes: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  category: string | null;
  section_id: string | null;
  is_all_day: boolean;
  color: string | null;
}

export interface TaskSection {
  id: string;
  created_at: string;
  user_id: string;
  name: string;
  order: number;
  include_in_focus_mode: boolean;
}

export interface Category {
  id: string;
  created_at: string;
  user_id: string;
  name: string;
  color: string;
}