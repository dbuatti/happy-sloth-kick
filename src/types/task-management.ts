export type TaskStatus = 'to-do' | 'completed' | 'in-progress';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RecurringType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  created_at: string;
  user_id: string;
  priority: TaskPriority;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number;
  parent_task_id: string | null;
  recurring_type: RecurringType;
  original_task_id: string | null;
  category: string | null;
  link: string | null;
  image_url: string | null;
  subtasks?: Task[];
}

export interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number;
  created_at: string;
  include_in_focus_mode: boolean;
  tasks: Task[];
}

export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}