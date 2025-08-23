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
export type NewWorkHourData = Omit<WorkHour, 'id' | 'user_id'>;
export type UpdateWorkHourData = Partial<Omit<WorkHour, 'id' | 'user_id'>>;

export type NewTaskCategoryData = Omit<TaskCategory, 'id' | 'user_id' | 'created_at'>;
export type UpdateTaskCategoryData = Partial<Omit<TaskCategory, 'id' | 'user_id' | 'created_at'>>;

export type NewTaskSectionData = Omit<TaskSection, 'id' | 'user_id' | 'created_at'>;
export type UpdateTaskSectionData = Partial<Omit<TaskSection, 'id' | 'user_id' | 'created_at'>>;

export type NewTaskData = Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'category_color' | 'is_daily_recurring'>;
export type UpdateTaskData = Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'category_color' | 'is_daily_recurring'>>;

export type NewProjectData = Omit<Project, 'id' | 'user_id' | 'created_at' | 'current_count'>;
export type UpdateProjectData = Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>;

export type NewAppointmentData = Omit<Appointment, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateAppointmentData = Partial<Omit<Appointment, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type NewWorryEntryData = Omit<WorryEntry, 'id' | 'user_id' | 'created_at'>;
export type UpdateWorryEntryData = Partial<Omit<WorryEntry, 'id' | 'user_id' | 'created_at'>>;

export type NewDevIdeaData = Omit<DevIdea, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'tags'> & { tagIds: string[] };
export type UpdateDevIdeaData = Partial<Omit<DevIdea, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'tags'>> & { tagIds?: string[] };

export type NewDevIdeaTagData = Omit<DevIdeaTag, 'id' | 'user_id' | 'created_at'>;
export type UpdateDevIdeaTagData = Partial<Omit<DevIdeaTag, 'id' | 'user_id' | 'created_at'>>;

export type NewPersonData = Omit<Person, 'id' | 'user_id' | 'created_at'>;
export type UpdatePersonData = Partial<Omit<Person, 'id' | 'user_id' | 'created_at'>>;

export type NewQuickLinkData = Omit<QuickLink, 'id' | 'user_id' | 'created_at' | 'link_order'>;
export type UpdateQuickLinkData = Partial<Omit<QuickLink, 'id' | 'user_id' | 'created_at'>>;

export type NewCustomCardData = Omit<CustomCard, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_visible'>;
export type UpdateCustomCardData = Partial<Omit<CustomCard, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type NewWeeklyFocusData = Omit<WeeklyFocus, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateWeeklyFocusData = Partial<Omit<WeeklyFocus, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'week_start_date'>>;

export type NewSleepRecordData = Omit<SleepRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateSleepRecordData = Partial<Omit<SleepRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type NewDoTodayOffLogEntryData = Omit<DoTodayOffLogEntry, 'id' | 'user_id' | 'created_at'>;
export type UpdateDoTodayOffLogEntryData = Partial<Omit<DoTodayOffLogEntry, 'id' | 'user_id' | 'created_at'>>;

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