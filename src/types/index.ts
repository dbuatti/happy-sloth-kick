// This file contains common types used throughout the application.

// Define the Task type based on your Supabase 'tasks' table schema.
export type Task = {
  id: string;
  description: string | null;
  status: "to-do" | "completed" | "skipped" | "archived";
  created_at: string;
  user_id: string;
  priority?: "low" | "medium" | "high" | "urgent" | null;
  due_date?: string | null;
  notes?: string | null;
  remind_at?: string | null;
  section_id?: string | null;
  order?: number | null;
  parent_task_id?: string | null;
  recurring_type?: "none" | "daily" | "weekly" | "monthly" | "yearly" | null;
  original_task_id?: string | null;
  category?: string | null; // This is the category ID (UUID)
  link?: string | null;
  image_url?: string | null;
  updated_at?: string | null;
  category_color?: string | null; // Derived property, made optional and nullable
};

// Define the TaskSection type based on your Supabase 'task_sections' table schema.
export type TaskSection = {
  id: string;
  name: string;
  user_id: string;
  order?: number | null;
  created_at?: string | null;
  include_in_focus_mode?: boolean | null;
};

// Define the TaskCategory type based on your Supabase 'task_categories' table schema.
export type TaskCategory = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
};

// Define the Profile type based on your Supabase 'profiles' table schema.
export type Profile = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  updated_at?: string | null;
};

// Define the Project type based on your Supabase 'projects' table schema.
export type Project = {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  current_count: number;
  created_at?: string | null;
  link?: string | null;
  notes?: string | null;
};

// Define the ScheduleAppointment type based on your Supabase 'schedule_appointments' table schema.
export type ScheduleAppointment = {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  date: string;
  start_time: string;
  end_time: string;
  color: string;
  created_at?: string | null;
  updated_at?: string | null;
  task_id?: string | null;
};

// Define the WeeklyFocus type based on your Supabase 'weekly_focus' table schema.
export type WeeklyFocus = {
  id: string;
  user_id: string;
  week_start_date: string;
  primary_focus?: string | null;
  secondary_focus?: string | null;
  tertiary_focus?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

// Define the CustomDashboardCard type based on your Supabase 'custom_dashboard_cards' table schema.
export type CustomDashboardCard = {
  id: string;
  user_id: string;
  title: string;
  content?: string | null;
  emoji?: string | null;
  card_order?: number | null;
  is_visible?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

// Define the GratitudeJournalEntry type based on your Supabase 'gratitude_journal_entries' table schema.
export type GratitudeJournalEntry = {
  id: string;
  user_id: string;
  entry: string;
  created_at?: string | null;
};

// Define the WorryJournalEntry type based on your Supabase 'worry_journal_entries' table schema.
export type WorryJournalEntry = {
  id: string;
  user_id: string;
  thought: string;
  created_at?: string | null;
};

// Define the SleepRecord type based on your Supabase 'sleep_records' table schema.
export type SleepRecord = {
  id: string;
  user_id: string;
  date: string;
  bed_time?: string | null;
  lights_off_time?: string | null;
  wake_up_time?: string | null;
  get_out_of_bed_time?: string | null;
  created_at: string;
  updated_at: string;
  time_to_fall_asleep_minutes?: number | null;
  sleep_interruptions_count?: number | null;
  sleep_interruptions_duration_minutes?: number | null;
  times_left_bed_count?: number | null;
  planned_wake_up_time?: string | null;
};

// Define the UserWorkHours type based on your Supabase 'user_work_hours' table schema.
export type UserWorkHours = {
  id: string;
  user_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  enabled?: boolean | null;
};

// Define the FocusSession type based on your Supabase 'focus_sessions' table schema.
export type FocusSession = {
  id: string;
  user_id: string;
  session_type: string;
  duration_minutes: number;
  start_time: string;
  end_time?: string | null;
  task_id?: string | null;
  completed_during_session?: boolean | null;
};

// Define the QuickLink type based on your Supabase 'quick_links' table schema.
export type QuickLink = {
  id: string;
  user_id: string;
  title: string;
  url: string;
  image_url?: string | null;
  link_order?: number | null;
  created_at?: string | null;
  emoji?: string | null;
  background_color?: string | null;
  avatar_text?: string | null;
};

// Define the PeopleMemory type based on your Supabase 'people_memory' table schema.
export type PeopleMemory = {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

// Define the DevIdea type based on your Supabase 'dev_ideas' table schema.
export type DevIdea = {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  created_at: string;
  image_url?: string | null;
  updated_at?: string | null;
  local_file_path?: string | null;
};

// Define the DevIdeaTag type based on your Supabase 'dev_idea_tags' table schema.
export type DevIdeaTag = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
};

// Define the DevIdeaTagAssociation type based on your Supabase 'dev_idea_tag_associations' table schema.
export type DevIdeaTagAssociation = {
  idea_id: string;
  tag_id: string;
};

// Define the DoTodayOffLog type based on your Supabase 'do_today_off_log' table schema.
export type DoTodayOffLog = {
  id: string;
  user_id: string;
  task_id: string;
  off_date: string;
  created_at?: string | null;
};