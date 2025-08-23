import { Database } from './supabase';

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];

export type Task = Tables<'tasks'> & {
  description: string | null; // Allow description to be null
  priority: 'urgent' | 'high' | 'medium' | 'low' | 'none' | null; // Allow priority to be null
  task_categories?: { name: string; color: string } | null;
};
export type TaskCategory = Tables<'task_categories'>;
export type TaskSection = Tables<'task_sections'>;
export type Project = Tables<'projects'>;
export type ScheduleAppointment = Tables<'schedule_appointments'>;
export type CustomDashboardCard = Tables<'custom_dashboard_cards'>;
export type GratitudeJournalEntry = Tables<'gratitude_journal_entries'>;
export type WorryJournalEntry = Tables<'worry_journal_entries'>;
export type SleepRecord = Tables<'sleep_records'>;
export type UserSetting = Tables<'user_settings'>;
export type QuickLink = Tables<'quick_links'>;
export type PeopleMemory = Tables<'people_memory'>;
export type DevIdea = Tables<'dev_ideas'>;
export type DevIdeaTag = Tables<'dev_idea_tags'>;
export type DevIdeaTagAssociation = Tables<'dev_idea_tag_associations'>;
export type DoTodayOffLog = Tables<'do_today_off_log'>;
export type UserWorkHour = Tables<'user_work_hours'>;
export type FocusSession = Tables<'focus_sessions'>;