import { Tables, Json } from './supabase';

// Supabase table types
export type WorkHour = Tables<'user_work_hours'>;
export type TaskCategory = Tables<'task_categories'>;
export type TaskSection = Tables<'task_sections'>;
export type Project = Tables<'projects'>;
export type Appointment = Tables<'schedule_appointments'>;
export type WorryEntry = Tables<'worry_journal_entries'>;
export type DevIdeaTag = Tables<'dev_idea_tags'>;
export type Person = Tables<'people_memory'>;
export type QuickLink = Tables<'quick_links'>;
export type CustomCard = Tables<'custom_dashboard_cards'>;
export type WeeklyFocus = Tables<'weekly_focus'>;
export type SleepRecord = Tables<'sleep_records'>;
export type DoTodayOffLogEntry = Tables<'do_today_off_log'>;
export type GratitudeEntry = Tables<'gratitude_journal_entries'>;

// Extended types for application logic
export type Task = Tables<'tasks'> & {
  category_color?: string;
  is_daily_recurring?: boolean; // Added for analytics
};

export type DevIdea = Tables<'dev_ideas'> & {
  tags: DevIdeaTag[];
  status: 'idea' | 'in-progress' | 'completed'; // Narrowing down status type
};

export type UserSettings = Tables<'user_settings'> & {
  dashboard_panel_sizes: number[]; // Assuming this is always an array
};

// New types for inserts/updates
export type NewWorkHourData = Omit<TablesInsert<'user_work_hours'>, 'id' | 'user_id'>;
export type UpdateWorkHourData = Partial<Omit<TablesUpdate<'user_work_hours'>, 'id' | 'user_id'>>;

export type NewTaskCategoryData = Omit<TablesInsert<'task_categories'>, 'id' | 'user_id' | 'created_at'>;
export type UpdateTaskCategoryData = Partial<Omit<TablesUpdate<'task_categories'>, 'id' | 'user_id' | 'created_at'>>;

export type NewTaskSectionData = Omit<TablesInsert<'task_sections'>, 'id' | 'user_id' | 'created_at'>;
export type UpdateTaskSectionData = Partial<Omit<TablesUpdate<'task_sections'>, 'id' | 'user_id' | 'created_at'>>;

export type NewTaskData = Omit<TablesInsert<'tasks'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateTaskData = Partial<Omit<TablesUpdate<'tasks'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type NewProjectData = Omit<TablesInsert<'projects'>, 'id' | 'user_id' | 'created_at' | 'current_count'>;
export type UpdateProjectData = Partial<Omit<TablesUpdate<'projects'>, 'id' | 'user_id' | 'created_at'>>;

export type NewAppointmentData = Omit<TablesInsert<'schedule_appointments'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateAppointmentData = Partial<Omit<TablesUpdate<'schedule_appointments'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type NewWorryEntryData = Omit<TablesInsert<'worry_journal_entries'>, 'id' | 'user_id' | 'created_at'>;
export type UpdateWorryEntryData = Partial<Omit<TablesUpdate<'worry_journal_entries'>, 'id' | 'user_id' | 'created_at'>>;

export type NewDevIdeaData = Omit<TablesInsert<'dev_ideas'>, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { tagIds: string[] };
export type UpdateDevIdeaData = Partial<Omit<TablesUpdate<'dev_ideas'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & { tagIds?: string[] };

export type NewDevIdeaTagData = Omit<TablesInsert<'dev_idea_tags'>, 'id' | 'user_id' | 'created_at'>;
export type UpdateDevIdeaTagData = Partial<Omit<TablesUpdate<'dev_idea_tags'>, 'id' | 'user_id' | 'created_at'>>;

export type NewPersonData = Omit<TablesInsert<'people_memory'>, 'id' | 'user_id' | 'created_at'>;
export type UpdatePersonData = Partial<Omit<TablesUpdate<'people_memory'>, 'id' | 'user_id' | 'created_at'>>;

export type NewQuickLinkData = Omit<TablesInsert<'quick_links'>, 'id' | 'user_id' | 'created_at' | 'link_order'>;
export type UpdateQuickLinkData = Partial<Omit<TablesUpdate<'quick_links'>, 'id' | 'user_id' | 'created_at'>>;

export type NewCustomCardData = Omit<TablesInsert<'custom_dashboard_cards'>, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_visible'>;
export type UpdateCustomCardData = Partial<Omit<TablesUpdate<'custom_dashboard_cards'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type NewWeeklyFocusData = Omit<TablesInsert<'weekly_focus'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateWeeklyFocusData = Partial<Omit<TablesUpdate<'weekly_focus'>, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'week_start_date'>>;

export type NewSleepRecordData = Omit<TablesInsert<'sleep_records'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateSleepRecordData = Partial<Omit<TablesUpdate<'sleep_records'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type NewDoTodayOffLogEntryData = Omit<TablesInsert<'do_today_off_log'>, 'id' | 'user_id' | 'created_at'>;
export type UpdateDoTodayOffLogEntryData = Partial<Omit<TablesUpdate<'do_today_off_log'>, 'id' | 'user_id' | 'created_at'>>;

export type NewGratitudeEntryData = Omit<TablesInsert<'gratitude_journal_entries'>, 'id' | 'user_id' | 'created_at'>;
export type UpdateGratitudeEntryData = Partial<Omit<TablesUpdate<'gratitude_journal_entries'>, 'id' | 'user_id' | 'created_at'>>;

// Analytics specific types
export type AnalyticsTask = Task & {
  is_daily_recurring: boolean;
};

// Props for useTasks hook
export interface UseTasksProps {
  userId: string;
  isDemo?: boolean;
  demoUserId?: string;
}