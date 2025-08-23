import { Tables, Json, Enums } from './supabase';

// Re-export Json for broader use
export { Json };

// --- Core Supabase Table Types ---
export type Profile = Tables<'profiles'>;
export type UserSettings = Tables<'user_settings'>;
export type Task = Tables<'tasks'> & { category?: TaskCategory | null }; // Add category relation
export type TaskCategory = Tables<'task_categories'>;
export type TaskSection = Tables<'task_sections'>;
export type Appointment = Tables<'schedule_appointments'>;
export type WorkHour = Tables<'user_work_hours'>;
export type CustomCard = Tables<'custom_dashboard_cards'>;
export type WeeklyFocus = Tables<'weekly_focus'>;
export type QuickLink = Tables<'quick_links'>;
export type Person = Tables<'people_memory'>;
export type GratitudeEntry = Tables<'gratitude_journal_entries'>;
export type WorryEntry = Tables<'worry_journal_entries'>;
export type SleepRecord = Tables<'sleep_records'>;
export type DevIdea = Tables<'dev_ideas'> & { tags: DevIdeaTag[] }; // Add tags relation
export type DevIdeaTag = Tables<'dev_idea_tags'>;
export type DoTodayOffLogEntry = Tables<'do_today_off_log'>;

// --- Extended/Derived Types ---
// Ensure Task['status'] includes 'archived'
export type TaskStatus = Enums<'task_status'> | 'archived';

// Task-related data for inserts/updates
export type NewTaskData = TablesInsert<'tasks'>;
export type UpdateTaskData = TablesUpdate<'tasks'>;
export type NewTaskCategoryData = TablesInsert<'task_categories'>;
export type UpdateTaskCategoryData = TablesUpdate<'task_categories'>;
export type NewTaskSectionData = TablesInsert<'task_sections'>;
export type UpdateTaskSectionData = TablesUpdate<'task_sections'>;

// Appointment-related data for inserts/updates
export type NewAppointmentData = TablesInsert<'schedule_appointments'>;
export type UpdateAppointmentData = TablesUpdate<'schedule_appointments'>;

// Dashboard-related data for inserts/updates
export type NewCustomCardData = TablesInsert<'custom_dashboard_cards'>;
export type UpdateCustomCardData = TablesUpdate<'custom_dashboard_cards'>;
export type UpdateWeeklyFocusData = TablesUpdate<'weekly_focus'>;

// QuickLink-related data for inserts/updates
export type NewQuickLinkData = TablesInsert<'quick_links'>;
export type UpdateQuickLinkData = TablesUpdate<'quick_links'>;

// PeopleMemory-related data for inserts/updates
export type NewPersonData = TablesInsert<'people_memory'>;
export type UpdatePersonData = TablesUpdate<'people_memory'>;

// Journal-related data for inserts/updates
export type NewGratitudeEntryData = TablesInsert<'gratitude_journal_entries'>;
export type NewWorryEntryData = TablesInsert<'worry_journal_entries'>;

// Sleep-related data for inserts/updates
export type NewSleepRecordData = TablesInsert<'sleep_records'>;
export type UpdateSleepRecordData = TablesUpdate<'sleep_records'>;
export interface SleepAnalyticsData {
  totalSleepDuration: number;
  averageSleepDuration: number;
  sleepEfficiency: number;
  bedTimeConsistency: number;
  wakeUpTimeConsistency: number;
  sleepInterruptions: number;
  timeToFallAsleep: number;
}

// DevIdeas-related data for inserts/updates
export type NewDevIdeaData = TablesInsert<'dev_ideas'>;
export type UpdateDevIdeaData = TablesUpdate<'dev_ideas'>;
export type NewDevIdeaTagData = TablesInsert<'dev_idea_tags'>;
export type UpdateDevIdeaTagData = TablesUpdate<'dev_idea_tags'>;

// DoTodayOffLog-related data for inserts/updates
export type NewDoTodayOffLogEntryData = TablesInsert<'do_today_off_log'>;


// --- Component Props Interfaces ---
export interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isDemo?: boolean;
  demoUserId?: string;
  setIsCommandPaletteOpen: (open: boolean) => void;
}

export interface UseTasksProps {
  userId?: string;
  isDemo?: boolean;
  demoUserId?: string;
}

export interface QuickLinksProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface PersonAvatarProps {
  person: Person;
  onEdit?: (person: Person) => void;
  onDelete?: (personId: string) => void;
  onUpdateAvatar?: (personId: string, newAvatarUrl: string) => void;
}

export interface MeditationNotesCardProps {
  settings: UserSettings | undefined;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  loading: boolean;
}

export interface SleepTrackerProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  isDemo?: boolean;
  demoUserId?: string;
}

export interface SleepDashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface SleepDiaryViewProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface SleepPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface DevSpaceProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface AnalyticsProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface TaskCalendarProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface DailyTasksV3Props {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface FocusModeProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface SettingsProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface MyHubProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface CommandPaletteProps {
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
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

export interface NewProjectData {
  name: string;
  description?: string | null;
  link?: string | null;
  notes?: string | null;
}

export interface UpdateProjectData extends Partial<NewProjectData> {
  current_count?: number;
}

export interface AnalyticsTask extends Task {
  category_name?: string;
  category_color?: string;
}

export interface MultiSelectOption {
  label: string;
  value: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export interface TaskCardProps {
  task: Task;
  categories: TaskCategory[];
  sections: TaskSection[];
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  isDragging?: boolean;
  tasks?: Task[]; // For subtasks rendering
}

export interface SortableTaskItemProps extends TaskCardProps {
  id: string;
}

export interface SortableSectionHeaderProps {
  section: TaskSection;
  onUpdateSectionName: (id: string, newName: string) => Promise<TaskSection>;
  onDeleteSection: (id: string) => Promise<void>;
  onUpdateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection>;
}

export interface TaskFormProps {
  initialData?: Partial<Task>;
  onSave: (taskData: NewTaskData | UpdateTaskData) => Promise<Task>;
  onCancel: () => void;
  sections: TaskSection[];
  categories: TaskCategory[];
  autoFocus?: boolean;
  createSection: (data: NewTaskSectionData) => Promise<TaskSection>;
  updateSection: (data: { id: string; updates: UpdateTaskSectionData }) => Promise<TaskSection>;
  deleteSection: (id: string) => Promise<void>;
}

export interface AddTaskFormProps {
  onAddTask: (data: NewTaskData) => Promise<Task>;
  onTaskAdded: () => void;
  categories: TaskCategory[];
  sections: TaskSection[];
  currentDate: Date;
  createSection: (data: NewTaskSectionData) => Promise<TaskSection>;
  updateSection: (data: { id: string; updates: UpdateTaskSectionData }) => Promise<TaskSection>;
  deleteSection: (id: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection>;
  showCompleted: boolean;
}

export interface DailyTasksHeaderProps {
  currentDate: Date;
  onAddTask: (data: NewTaskData) => Promise<Task>;
  onRefreshTasks: () => void;
  dailyProgress: { completed: number; total: number };
  sections: TaskSection[];
  categories: TaskCategory[];
}

export interface QuickLinkFormProps {
  initialData?: Partial<QuickLink>;
  onSave: (data: NewQuickLinkData | UpdateQuickLinkData) => Promise<QuickLink>;
  onCancel: () => void;
}

export interface DraggableAppointmentCardProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onUnschedule: (appointmentId: string) => Promise<void>;
  trackIndex: number;
  totalTracks: number;
  style: React.CSSProperties;
}

export interface DraggableScheduleTaskItemProps {
  task: Task;
  categories: TaskCategory[];
  sections: TaskSection[];
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
}

export interface NextTaskCardProps {
  tasks: Task[];
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
}

export interface CustomCardComponentProps {
  card: CustomCard;
  onUpdate: (id: string, updates: UpdateCustomCardData) => Promise<CustomCard>;
  onDelete: (id: string) => Promise<void>;
}

export interface WeeklyFocusCardProps {
  weeklyFocus: WeeklyFocus | undefined;
  updateWeeklyFocus: (updates: UpdateWeeklyFocusData) => Promise<WeeklyFocus>;
  setPrimaryFocus: (value: string) => void;
  setSecondaryFocus: (value: string) => void;
  setTertiaryFocus: (value: string) => void;
  primaryFocus: string;
  secondaryFocus: string;
  tertiaryFocus: string;
}

export interface DashboardLayoutSettingsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customCards: CustomCard[];
  updateCustomCard: (id: string, updates: UpdateCustomCardData) => Promise<CustomCard>;
  deleteCustomCard: (id: string) => Promise<void>;
  settings: UserSettings | undefined;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
}

export interface SortableCustomCardProps {
  id: string;
  card: CustomCard;
  onUpdateCard: (id: string, updates: UpdateCustomCardData) => Promise<void>;
  onDeleteCard: (id: string) => Promise<void>;
}

export interface AppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewAppointmentData | UpdateAppointmentData) => Promise<Appointment>;
  onDelete: (id: string) => Promise<void>;
  initialData?: Appointment;
  selectedDate: Date;
  selectedTimeSlot: { start: Date; end: Date } | null;
  prefilledData?: Partial<NewAppointmentData>;
  tasks: Task[];
}

export interface TaskOverviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  categories: TaskCategory[];
  sections: TaskSection[];
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
}

export interface DailyScheduleViewProps {
  currentDate: Date;
  appointments: Appointment[];
  tasks: Task[];
  workHours: WorkHour[];
  allCategories: TaskCategory[];
  allSections: TaskSection[];
  settings: UserSettings | undefined;
  onAddAppointment: (data: NewAppointmentData) => Promise<Appointment>;
  onUpdateAppointment: (id: string, updates: UpdateAppointmentData) => Promise<Appointment>;
  onDeleteAppointment: (id: string) => Promise<void>;
  onAddTask: (data: NewTaskData) => Promise<Task>;
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onUpdateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection>;
}