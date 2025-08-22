// This file contains common types used throughout the application.

// Define the Task type based on your Supabase 'tasks' table schema.
// 'category_color' is a derived property, so it's made optional.
export type Task = {
  id: string;
  description: string;
  status: string;
  created_at: string; // Not nullable in schema
  user_id: string;
  priority?: string;
  due_date?: string;
  notes?: string;
  remind_at?: string;
  section_id?: string;
  order?: number;
  parent_task_id?: string;
  recurring_type?: string;
  original_task_id?: string;
  category?: string; // This is the category ID (UUID)
  link?: string;
  image_url?: string;
  updated_at?: string; // Nullable in schema
  category_color?: string; // Derived property, made optional
};

// Define the TaskSection type based on your Supabase 'task_sections' table schema.
// 'created_at' is nullable in the schema, so it's made optional.
export type TaskSection = {
  id: string;
  name: string;
  user_id: string;
  order?: number;
  created_at?: string; // Nullable in schema, made optional
  include_in_focus_mode?: boolean;
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
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  updated_at?: string;
};

// Define the Project type based on your Supabase 'projects' table schema.
export type Project = {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  current_count: number;
  created_at?: string;
  link?: string;
  notes?: string;
};

// Define the ScheduleAppointment type based on your Supabase 'schedule_appointments' table schema.
export type ScheduleAppointment = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
  color: string;
  created_at?: string;
  updated_at?: string;
  task_id?: string;
};

// Define the WeeklyFocus type based on your Supabase 'weekly_focus' table schema.
export type WeeklyFocus = {
  id: string;
  user_id: string;
  week_start_date: string;
  primary_focus?: string;
  secondary_focus?: string;
  tertiary_focus?: string;
  created_at?: string;
  updated_at?: string;
};

// Define the CustomDashboardCard type based on your Supabase 'custom_dashboard_cards' table schema.
export type CustomDashboardCard = {
  id: string;
  user_id: string;
  title: string;
  content?: string;
  emoji?: string;
  card_order?: number;
  is_visible?: boolean;
  created_at?: string;
  updated_at?: string;
};

// Define the GratitudeJournalEntry type based on your Supabase 'gratitude_journal_entries' table schema.
export type GratitudeJournalEntry = {
  id: string;
  user_id: string;
  entry: string;
  created_at?: string;
};

// Define the WorryJournalEntry type based on your Supabase 'worry_journal_entries' table schema.
export type WorryJournalEntry = {
  id: string;
  user_id: string;
  thought: string;
  created_at?: string;
};

// Define the SleepRecord type based on your Supabase 'sleep_records' table schema.
export type SleepRecord = {
  id: string;
  user_id: string;
  date: string;
  bed_time?: string;
  lights_off_time?: string;
  wake_up_time?: string;
  get_out_of_bed_time?: string;
  created_at: string;
  updated_at: string;
  time_to_fall_asleep_minutes?: number;
  sleep_interruptions_count?: number;
  sleep_interruptions_duration_minutes?: number;
  times_left_bed_count?: number;
  planned_wake_up_time?: string;
};

// Define the UserWorkHours type based on your Supabase 'user_work_hours' table schema.
export type UserWorkHours = {
  id: string;
  user_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  enabled?: boolean;
};

// Define the FocusSession type based on your Supabase 'focus_sessions' table schema.
export type FocusSession = {
  id: string;
  user_id: string;
  session_type: string;
  duration_minutes: number;
  start_time: string;
  end_time?: string;
  task_id?: string;
  completed_during_session?: boolean;
};

// Define the QuickLink type based on your Supabase 'quick_links' table schema.
export type QuickLink = {
  id: string;
  user_id: string;
  title: string;
  url: string;
  image_url?: string;
  link_order?: number;
  created_at?: string;
  emoji?: string;
  background_color?: string;
  avatar_text?: string;
};

// Define the PeopleMemory type based on your Supabase 'people_memory' table schema.
export type PeopleMemory = {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string;
  notes?: string;
  created_at?: string;
};

// Define the DevIdea type based on your Supabase 'dev_ideas' table schema.
export type DevIdea = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  created_at: string;
  image_url?: string;
  updated_at?: string;
  local_file_path?: string;
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
  created_at?: string;
};