import { Tables, Json, Enums } from './supabase';

// Re-export Json from supabase types
export { Json };

// Base types from Supabase tables
export type Task = Tables<'tasks'> & { category?: TaskCategory | null };
export type TaskCategory = Tables<'task_categories'>;
export type TaskSection = Tables<'task_sections'>;
export type UserSettings = Tables<'user_settings'>;
export type Appointment = Tables<'schedule_appointments'>;
export type CustomCard = Tables<'custom_dashboard_cards'>;
export type WeeklyFocus = Tables<'weekly_focus'>;
export type QuickLink = Tables<'quick_links'>;
export type Person = Tables<'people_memory'>;
export type GratitudeEntry = Tables<'gratitude_journal_entries'>;
export type WorryEntry = Tables<'worry_journal_entries'>;
export type DevIdea = Tables<'dev_ideas'> & { tags: DevIdeaTag[] };
export type DevIdeaTag = Tables<'dev_idea_tags'>;
export type WorkHour = Tables<'user_work_hours'>;
export type SleepRecord = Tables<'sleep_records'>;
export type Project = Tables<'projects'>;
export type DoTodayOffLogEntry = Tables<'do_today_off_log'>;

// Extended types for forms/mutations
export type NewTaskData = TablesInsert<'tasks'>;
export type UpdateTaskData = TablesUpdate<'tasks'>;
export type NewTaskCategoryData = TablesInsert<'task_categories'>;
export type UpdateTaskCategoryData = TablesUpdate<'task_categories'>;
export type NewTaskSectionData = TablesInsert<'task_sections'>;
export type UpdateTaskSectionData = TablesUpdate<'task_sections'>;
export type NewAppointmentData = TablesInsert<'schedule_appointments'>;
export type UpdateAppointmentData = TablesUpdate<'schedule_appointments'>;
export type NewCustomCardData = TablesInsert<'custom_dashboard_cards'>;
export type UpdateCustomCardData = TablesUpdate<'custom_dashboard_cards'>;
export type UpdateWeeklyFocusData = TablesUpdate<'weekly_focus'>;
export type NewQuickLinkData = TablesInsert<'quick_links'>;
export type UpdateQuickLinkData = TablesUpdate<'quick_links'>;
export type NewPersonData = TablesInsert<'people_memory'>;
export type UpdatePersonData = TablesUpdate<'people_memory'>;
export type NewGratitudeEntryData = TablesInsert<'gratitude_journal_entries'>;
export type NewWorryEntryData = TablesInsert<'worry_journal_entries'>;
export type NewDevIdeaData = TablesInsert<'dev_ideas'> & { tagIds?: string[] };
export type UpdateDevIdeaData = TablesUpdate<'dev_ideas'> & { tagIds?: string[] };
export type NewDevIdeaTagData = TablesInsert<'dev_idea_tags'>;
export type UpdateDevIdeaTagData = TablesUpdate<'dev_idea_tags'>;
export type NewWorkHourData = TablesInsert<'user_work_hours'>;
export type UpdateWorkHourData = TablesUpdate<'user_work_hours'>;
export type NewSleepRecordData = TablesInsert<'sleep_records'>;
export type UpdateSleepRecordData = TablesUpdate<'sleep_records'>;
export type NewProjectData = TablesInsert<'projects'>;
export type UpdateProjectData = TablesUpdate<'projects'>;
export type NewDoTodayOffLogEntryData = TablesInsert<'do_today_off_log'>;

// Specific types for hooks/components
export type UseTasksProps = {
  userId?: string;
  isDemo?: boolean;
  demoUserId?: string;
};

// Ensure Task['status'] includes 'archived'
export type TaskStatus = Enums<'tasks', 'status'> | 'archived'; // Assuming 'status' is the enum name for tasks

export type AnalyticsTask = Task; // Alias for clarity in Analytics

export type SleepAnalyticsData = {
  totalSleepDuration: number;
  averageSleepDuration: number;
  sleepEfficiency: number;
  bedTimeConsistency: number;
  wakeUpTimeConsistency: number;
  sleepDebt: number;
  sleepTrend: { date: string; duration: number }[];
};

// Props for pages
export type DashboardProps = { isDemo?: boolean; demoUserId?: string };
export type DailyTasksV3Props = { isDemo?: boolean; demoUserId?: string };
export type FocusModeProps = { isDemo?: boolean; demoUserId?: string };
export type DevSpaceProps = { isDemo?: boolean; demoUserId?: string };
export type SettingsProps = { isDemo?: boolean; demoUserId?: string };
export type AnalyticsProps = { isDemo?: boolean; demoUserId?: string };
export type ArchiveProps = { isDemo?: boolean; demoUserId?: string };
export type SleepPageProps = { isDemo?: boolean; demoUserId?: string };
export type MyHubProps = { isDemo?: boolean; demoUserId?: string };
export type TaskCalendarProps = { isDemo?: boolean; demoUserId?: string };
export type TimeBlockScheduleProps = { isDemo?: boolean; demoUserId?: string };
export type SleepTrackerProps = {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  isDemo?: boolean;
  demoUserId?: string;
};
export type SleepDashboardProps = { isDemo?: boolean; demoUserId?: string };
export type SleepDiaryViewProps = { isDemo?: boolean; demoUserId?: string };

// Component specific props
export type SidebarProps = {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isDemo?: boolean;
  demoUserId?: string;
  setIsCommandPaletteOpen: (open: boolean) => void;
};

export type QuickLinksProps = {
  isDemo?: boolean;
  demoUserId?: string;
};

export type NextTaskCardProps = {
  tasks: Task[];
};

export type MeditationNotesCardProps = {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  loading: boolean;
};

export type SortableCustomCardProps = {
  card: CustomCard;
  onUpdateCard: (id: string, updates: UpdateCustomCardData) => Promise<void>;
  onDeleteCard: (id: string) => Promise<void>;
};

export type DraggableScheduleTaskItemProps = {
  task: Task;
  sections: TaskSection[];
  categories: TaskCategory[];
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<void>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
};

export type AppointmentFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewAppointmentData | UpdateAppointmentData) => Promise<Appointment>;
  onDelete: (id: string) => Promise<boolean>;
  initialData?: Appointment | null;
  selectedDate: Date;
  selectedTimeSlot: { start: string; end: string } | null;
  prefilledData?: Partial<NewAppointmentData>;
  tasks: Task[];
};

export type DraggableAppointmentCardProps = {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onUnschedule: (appointmentId: string) => Promise<void>;
  trackIndex: number;
  totalTracks: number;
  style: React.CSSProperties;
};

export type SortableSectionHeaderProps = {
  section: TaskSection;
  onUpdateSectionName: (id: string, newName: string) => Promise<void>;
  onDeleteSection: (id: string) => Promise<void>;
  onUpdateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
};

export type TaskFormProps = {
  initialData?: Task | NewTaskData;
  onSave: (taskData: NewTaskData | UpdateTaskData) => Promise<Task>;
  onCancel: () => void;
  sections: TaskSection[];
  categories: TaskCategory[];
  autoFocus?: boolean;
  createSection: (data: NewTaskSectionData) => Promise<TaskSection>;
  updateSection: (data: { id: string; updates: UpdateTaskSectionData }) => Promise<TaskSection>;
  deleteSection: (id: string) => Promise<void>;
  createCategory: (data: NewTaskCategoryData) => Promise<TaskCategory>;
  updateCategory: (id: string, updates: UpdateTaskCategoryData) => Promise<TaskCategory>;
  deleteCategory: (id: string) => Promise<void>;
};

export type AddTaskFormProps = {
  onAddTask: (
    description: string,
    sectionId: string | null,
    parentTaskId: string | null,
    dueDate: Date | null,
    categoryId: string | null,
    priority: string
  ) => Promise<Task>;
  onTaskAdded: () => void;
  sections: TaskSection[];
  categories: TaskCategory[];
  currentDate: Date;
  createSection: (data: NewTaskSectionData) => Promise<TaskSection>;
  updateSection: (data: { id: string; updates: UpdateTaskSectionData }) => Promise<TaskSection>;
  deleteSection: (id: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  showCompleted: boolean;
};

export type TaskCardProps = {
  task: Task;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<void>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  isDragging?: boolean;
  categories: TaskCategory[];
  sections: TaskSection[];
};

export type TaskOverviewDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  categories: TaskCategory[];
  sections: TaskSection[];
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<void>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
};

export type DailyTasksHeaderProps = {
  currentDate: Date;
  onAddTask: (
    description: string,
    sectionId: string | null,
    parentTaskId: string | null,
    dueDate: Date | null,
    categoryId: string | null,
    priority: string
  ) => Promise<Task>;
  onRefreshTasks: () => void;
  dailyProgress: { completed: number; total: number };
  sections: TaskSection[];
  categories: TaskCategory[];
};

export type DevIdeaFormProps = {
  initialData?: DevIdea | NewDevIdeaData;
  onSave: (ideaData: NewDevIdeaData | UpdateDevIdeaData) => Promise<DevIdea>;
  onCancel: () => void;
  tags: DevIdeaTag[];
  onCreateTag: (name: string, color: string) => Promise<DevIdeaTag>;
  onDeleteTag: (id: string) => Promise<void>;
};

export type CommandPaletteProps = {
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
};

export type TaskListProps = {
  tasks: Task[];
  categories: TaskCategory[];
  sections: TaskSection[];
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddTask: (
    description: string,
    sectionId: string | null,
    parentTaskId: string | null,
    dueDate: Date | null,
    categoryId: string | null,
    priority: string
  ) => Promise<Task>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task | undefined>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  createCategory: (data: NewTaskCategoryData) => Promise<TaskCategory>;
  updateCategory: (id: string, updates: UpdateTaskCategoryData) => Promise<TaskCategory>;
  deleteCategory: (id: string) => Promise<void>;
  createSection: (data: NewTaskSectionData) => Promise<TaskSection>;
  updateSection: (data: { id: string; updates: UpdateTaskSectionData }) => Promise<TaskSection>;
  deleteSection: (id: string) => Promise<void>;
  reorderTasks: (activeId: string, overId: string, newParentTaskId: string | null, newSectionId: string | null, newOrder: number) => Promise<void>;
  reorderSections: (updates: { id: string; order: number; name: string; include_in_focus_mode: boolean | null }[]) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  showCompleted: boolean;
};

export type DateRange = {
  from?: Date;
  to?: Date;
};