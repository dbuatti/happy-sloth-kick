import { Tables, Json, Enums } from './supabase';

// Re-export all types from supabase.ts
export * from './supabase';

// Derived types for common table structures
export type Task = Tables<'tasks'> & {
  category_color?: string;
  is_daily_recurring?: boolean;
};
// Ensure Task['status'] includes 'archived'
export type TaskStatus = Enums<'task_status'> | 'archived'; // Assuming 'task_status' is the enum name

export type TaskCategory = Tables<'task_categories'>;
export type TaskSection = Tables<'task_sections'>; // order is number | null in DB, so it should be here too.
export type Project = Tables<'projects'>;
export type Appointment = Tables<'schedule_appointments'>;
export type WorryEntry = Tables<'worry_journal_entries'>;
export type GratitudeEntry = Tables<'gratitude_journal_entries'>;
export type DevIdea = Tables<'dev_ideas'> & {
  tags: DevIdeaTag[];
};
export type DevIdeaTag = Tables<'dev_idea_tags'>;
export type Person = Tables<'people_memory'>;
export type QuickLink = Tables<'quick_links'>;
export type CustomCard = Tables<'custom_dashboard_cards'>;
export type WeeklyFocus = Tables<'weekly_focus'>;
export type SleepRecord = Tables<'sleep_records'>;
export type WorkHour = Tables<'user_work_hours'>;
export type DoTodayOffLogEntry = Tables<'do_today_off_log'>;
export type UserSettings = Tables<'user_settings'>; // This uses Json type internally
export type AuthUser = Tables<'profiles'>;

// New types for inserts/updates
export type NewWorkHourData = Omit<Tables<'user_work_hours'>, 'id' | 'user_id'>;
export type UpdateWorkHourData = Partial<Omit<Tables<'user_work_hours'>, 'id' | 'user_id'>>;

export type NewTaskCategoryData = Omit<Tables<'task_categories'>, 'id' | 'user_id' | 'created_at'>;
export type UpdateTaskCategoryData = Partial<Omit<Tables<'task_categories'>, 'id' | 'user_id' | 'created_at'>>;

export type NewTaskSectionData = Omit<Tables<'task_sections'>, 'id' | 'user_id' | 'created_at'>;
export type UpdateTaskSectionData = Partial<Omit<Tables<'task_sections'>, 'id' | 'user_id' | 'created_at'>>;

export type NewTaskData = Omit<Tables<'tasks'>, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'> & { status?: TaskStatus }; // Allow status to be optional and use TaskStatus
export type UpdateTaskData = Partial<Omit<Tables<'tasks'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & { status?: TaskStatus };

export type NewProjectData = Omit<Tables<'projects'>, 'id' | 'user_id' | 'created_at' | 'current_count'>;
export type UpdateProjectData = Partial<Omit<Tables<'projects'>, 'id' | 'user_id' | 'created_at'>>;

export type NewAppointmentData = Omit<Tables<'schedule_appointments'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateAppointmentData = Partial<Omit<Tables<'schedule_appointments'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type NewWorryEntryData = Omit<Tables<'worry_journal_entries'>, 'id' | 'user_id' | 'created_at'>;
export type UpdateWorryEntryData = Partial<Omit<Tables<'worry_journal_entries'>, 'id' | 'user_id' | 'created_at'>>;

export type NewGratitudeEntryData = Omit<Tables<'gratitude_journal_entries'>, 'id' | 'user_id' | 'created_at'>;
export type UpdateGratitudeEntryData = Partial<Omit<Tables<'gratitude_journal_entries'>, 'id' | 'user_id' | 'created_at'>>;

export type NewDevIdeaData = Omit<Tables<'dev_ideas'>, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { tagIds?: string[] };
export type UpdateDevIdeaData = Partial<Omit<Tables<'dev_ideas'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & { tagIds?: string[] };

export type NewDevIdeaTagData = Omit<Tables<'dev_idea_tags'>, 'id' | 'user_id' | 'created_at'>;
export type UpdateDevIdeaTagData = Partial<Omit<Tables<'dev_idea_tags'>, 'id' | 'user_id' | 'created_at'>>;

export type NewPersonData = Omit<Tables<'people_memory'>, 'id' | 'user_id' | 'created_at'>;
export type UpdatePersonData = Partial<Omit<Tables<'people_memory'>, 'id' | 'user_id' | 'created_at'>>;

export type NewQuickLinkData = Omit<Tables<'quick_links'>, 'id' | 'user_id' | 'created_at' | 'link_order'>;
export type UpdateQuickLinkData = Partial<Omit<Tables<'quick_links'>, 'id' | 'user_id' | 'created_at'>>;

export type NewCustomCardData = Omit<Tables<'custom_dashboard_cards'>, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_visible'>;
export type UpdateCustomCardData = Partial<Omit<Tables<'custom_dashboard_cards'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type NewWeeklyFocusData = Omit<Tables<'weekly_focus'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateWeeklyFocusData = Partial<Omit<Tables<'weekly_focus'>, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'week_start_date'>>;

export type NewSleepRecordData = Omit<Tables<'sleep_records'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateSleepRecordData = Partial<Omit<Tables<'sleep_records'>, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type NewDoTodayOffLogEntryData = Omit<Tables<'do_today_off_log'>, 'id' | 'user_id' | 'created_at'>;
export type UpdateDoTodayOffLogEntryData = Partial<Omit<Tables<'do_today_off_log'>, 'id' | 'user_id' | 'created_at'>>;

// Additional types
export interface UseTasksProps {
  userId: string;
  isDemo?: boolean;
  demoUserId?: string;
}

export interface SleepAnalyticsData {
  date: string;
  totalSleepMinutes: number;
  timeInBedMinutes: number;
  sleepEfficiency: number;
  timeToFallAsleep: number;
  interruptionsCount: number;
  interruptionsDurationMinutes: number;
}

export type AnalyticsTask = Task & {
  is_daily_recurring: boolean;
};

export interface SleepDashboardProps {
  dateRange: { from: Date; to: Date } | undefined;
  setDateRange: React.Dispatch<React.SetStateAction<{ from: Date; to: Date } | undefined>>;
  demoUserId?: string;
}

export interface SleepDiaryViewProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface CommandPaletteProps {
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}

export interface MyHubProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface DailyTasksV3Props {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface FocusModeProps {
  demoUserId?: string;
}

export interface DevSpaceProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface SettingsProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface AnalyticsProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface ProjectBalanceTrackerProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface TaskCalendarProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface SleepPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface MindfulnessToolsProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isDemo?: boolean;
  demoUserId?: string;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface SleepTrackerProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  isDemo?: boolean;
  demoUserId?: string;
}

export interface QuickLinksProps {
  isDemo?: boolean;
  demoUserId?: string;
}