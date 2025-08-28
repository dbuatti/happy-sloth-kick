export interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'in-progress' | 'completed';
  created_at: string;
  user_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number | null;
  parent_task_id: string | null;
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly' | null;
  original_task_id: string | null;
  category: string | null;
  link: string | null;
  image_url: string | null;
  updated_at: string | null;
}

export interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
  created_at: string;
  include_in_focus_mode: boolean | null;
}