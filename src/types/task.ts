export type TaskStatus = 'to-do' | 'completed' | 'skipped' | 'archived';
export type RecurringType = 'none' | 'daily' | 'weekly' | 'monthly';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low' | null;

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
  order: number | null;
  parent_task_id: string | null;
  recurring_type: RecurringType;
  original_task_id: string | null;
  category: string | null;
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

export interface DailyTaskCount {
  totalPendingCount: number;
  completedCount: number;
  overdueCount: number;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  current_count: number;
  created_at: string;
  link: string | null;
  notes: string | null;
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

export interface CustomDashboardCard {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  emoji: string | null;
  card_order: number | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuickLink {
  id: string;
  user_id: string;
  title: string;
  url: string;
  image_url: string | null;
  link_order: number | null;
  created_at: string;
  emoji: string | null;
  background_color: string | null;
  avatar_text: string | null;
}

export interface WeeklyFocus {
  id: string;
  user_id: string;
  week_start_date: string;
  primary_focus: string | null;
  secondary_focus: string | null;
  tertiary_focus: string | null;
  created_at: string;
  updated_at: string;
}

export interface GratitudeJournalEntry {
  id: string;
  user_id: string;
  entry: string;
  created_at: string;
}

export interface WorryJournalEntry {
  id: string;
  user_id: string;
  thought: string;
  created_at: string;
}

export interface SleepRecord {
  id: string;
  user_id: string;
  date: string;
  bed_time: string | null;
  lights_off_time: string | null;
  wake_up_time: string | null;
  get_out_of_bed_time: string | null;
  created_at: string;
  updated_at: string;
  time_to_fall_asleep_minutes: number | null;
  sleep_interruptions_count: number | null;
  sleep_interruptions_duration_minutes: number | null;
  times_left_bed_count: number | null;
  planned_wake_up_time: string | null;
}

export interface PeopleMemory {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  notes: string | null;
  created_at: string;
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

export interface WorkHour {
  id: string;
  user_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  enabled: boolean;
}

export interface DoTodayOffLog {
  id: string;
  user_id: string;
  task_id: string;
  date: string;
  created_at: string;
}