export type TaskStatus = 'to-do' | 'completed' | 'skipped' | 'archived';
export type RecurringType = 'none' | 'daily' | 'weekly' | 'monthly';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | null;

export interface Task {
  id: string;
  description: string | null;
  status: TaskStatus;
  created_at: string;
  user_id: string;
  priority: TaskPriority;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number | null;
  parent_task_id: string | null;
  recurring_type: RecurringType;
  original_task_id: string | null;
  category: string | null;
  link: string | null;
  image_url: string | null;
  updated_at?: string | null;
  category_color?: string | null; // Added for processed tasks
}

export interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
  created_at: string;
  include_in_focus_mode: boolean | null;
}

export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

export interface DoTodayOffLog {
  id: string;
  user_id: string;
  task_id: string;
  off_date: string;
  created_at: string;
}

export interface DailyTaskCount {
  totalPendingCount: number;
  completedCount: number;
  overdueCount: number;
}

export type CategoryColorKey =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'orange'
  | 'pink'
  | 'teal'
  | 'cyan'
  | 'gray';

export interface CategoryColorProps {
  name: string;
  backgroundClass: string;
  dotColor: string;
  dotBorder: string;
  bg: string; // Added for direct background color access
}

export interface Appointment {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  color: string;
  created_at: string;
  updated_at: string;
  task_id: string | null;
}