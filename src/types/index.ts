import { Tables, TablesInsert, TablesUpdate, Enums, Json as SupabaseJson } from '@/integrations/supabase/database.types';
import { Layout, Layouts } from 'react-grid-layout';

// Re-export Json from supabase types
export type { SupabaseJson as Json };

// Base types from Supabase tables
export type UserSettings = Tables<'user_settings'>;
export type Task = Tables<'tasks'> & {
  task_categories?: TaskCategory | null;
  subtasks?: Task[];
};
export type TaskCategory = Tables<'task_categories'>;
export type TaskSection = Tables<'task_sections'>;
export type Appointment = Tables<'schedule_appointments'>;
export type CustomCard = Tables<'custom_dashboard_cards'>;
export type WeeklyFocus = Tables<'weekly_focus'>;
export type QuickLink = Tables<'quick_links'>;
export type Person = Tables<'people_memory'>;
export type GratitudeEntry = Tables<'gratitude_journal_entries'>;
export type WorryEntry = Tables<'worry_journal_entries'>;
export type DevIdea = Tables<'dev_ideas'> & {
  tags: DevIdeaTag[];
};
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

// Ensure Task['status'] includes 'archived'
export type TaskStatus = Enums<'task_status'> | 'archived';

// Props Interfaces
export interface UseTasksProps {
  userId: string | undefined;
  isDemo?: boolean;
  demoUserId?: string;
}

export interface NextTaskCardProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
}

export interface QuickLinksProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface PersonAvatarProps {
  person: Person;
  onEdit: (person: Person) => void;
  onDelete: (id: string) => Promise<void>;
  onUpdateAvatar: (id: string, url: string | null) => Promise<void>;
}

export interface PeopleMemoryCardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface MeditationNotesCardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface WeeklyFocusCardProps {
  weeklyFocus: WeeklyFocus | undefined;
  updateWeeklyFocus: (updates: UpdateWeeklyFocusData) => Promise<WeeklyFocus>;
  primaryFocus: string;
  secondaryFocus: string;
  tertiaryFocus: string;
  setPrimaryFocus: (value: string) => void;
  setSecondaryFocus: (value: string) => void;
  setTertiaryFocus: (value: string) => void;
}

export interface CustomCardComponentProps {
  card: CustomCard;
  onSave: (id: string, updates: UpdateCustomCardData) => Promise<CustomCard>;
  onDelete: (id: string) => Promise<void>;
}

export interface SortableCustomCardProps {
  id: string;
  card: CustomCard;
  onSave: (id: string, updates: UpdateCustomCardData) => Promise<CustomCard>;
  onDelete: (id: string) => Promise<void>;
  isDragging?: boolean;
}

export interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface TaskOverviewDialogProps {
  task: Task;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  categories: TaskCategory[];
  sections: TaskSection[];
}

export interface TaskItemProps {
  task: Task;
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  categories: TaskCategory[];
  sections: TaskSection[];
  isDragging?: boolean;
  tasks: Task[]; // For rendering subtasks
  doTodayOffLog: DoTodayOffLogEntry[] | undefined;
}

export interface SortableTaskItemProps {
  id: string;
  task: Task;
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  categories: TaskCategory[];
  sections: TaskSection[];
  isDragging?: boolean;
  tasks: Task[]; // For rendering subtasks
  doTodayOffLog: DoTodayOffLogEntry[] | undefined;
}

export interface SortableSectionHeaderProps {
  id: string;
  section: TaskSection;
  onUpdateSectionName: (id: string, newName: string) => Promise<TaskSection>;
  onDeleteSection: (id: string) => Promise<void>;
  onToggleIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection>;
  isDragging?: boolean;
}

export interface TaskFormProps {
  initialData?: Partial<Task>;
  onSave: (data: NewTaskData | UpdateTaskData) => Promise<Task>;
  onCancel?: () => void;
  categories: TaskCategory[];
  sections: TaskSection[];
  parentTaskId?: string | null;
  isSubtask?: boolean;
}

export interface AddTaskFormProps {
  onAddTask: (description: string, sectionId: string | null, parentTaskId: string | null, dueDate: Date | null, categoryId: string | null, priority: string) => Promise<Task>;
  categories: TaskCategory[];
  sections: TaskSection[];
  currentDate: Date;
  createSection: (data: NewTaskSectionData) => Promise<TaskSection>;
  updateSection: (data: { id: string; updates: UpdateTaskSectionData }) => Promise<TaskSection>;
  deleteSection: (id: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection>;
  showCompleted: boolean;
  parentTaskId?: string | null;
  onClose?: () => void;
}

export interface TaskListProps {
  tasks: Task[];
  categories: TaskCategory[];
  sections: TaskSection[];
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddTask: (description: string, sectionId: string | null, parentTaskId: string | null, dueDate: Date | null, categoryId: string | null, priority: string) => Promise<Task>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  createCategory: (data: NewTaskCategoryData) => Promise<TaskCategory>;
  updateCategory: (data: { id: string; updates: UpdateTaskCategoryData }) => Promise<TaskCategory>;
  deleteCategory: (id: string) => Promise<void>;
  createSection: (data: NewTaskSectionData) => Promise<TaskSection>;
  updateSection: (data: { id: string; updates: UpdateTaskSectionData }) => Promise<TaskSection>;
  deleteSection: (id: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection>;
  showCompleted: boolean;
  filterCategory?: string;
  doTodayOffLog: DoTodayOffLogEntry[] | undefined;
}

export interface FocusModeProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export interface DevSpaceProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface WorkHoursSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  workHours: WorkHour[];
  onSaveWorkHours: (workHours: WorkHour[]) => Promise<void>;
}

export interface SleepTrackerProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  isDemo?: boolean;
  demoUserId?: string;
}

export interface SleepAnalyticsData {
  totalSleepDuration: number;
  averageSleepDuration: number;
  sleepEfficiency: number;
  timeToFallAsleep: number;
  sleepInterruptions: number;
  records: SleepRecord[];
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

export interface MyHubProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface AppointmentFormProps {
  initialData?: Partial<Appointment>;
  onSave: (data: NewAppointmentData | UpdateAppointmentData) => Promise<Appointment>;
  onCancel: () => void;
  tasks: Task[];
  selectedDate: Date;
  selectedTimeSlot?: { start: Date; end: Date };
}

export interface CustomCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: {
    type: 'task' | 'appointment';
    task?: Task;
    appointment?: Appointment;
  };
  color?: string;
}

export interface TaskCalendarProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface ProjectBalanceTrackerProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface DailyScheduleViewProps {
  currentDate: Date;
  workHours: WorkHour[];
  tasks: Task[];
  appointments: Appointment[];
  allCategories: TaskCategory[];
  allSections: TaskSection[];
  onAddAppointment: (title: string, startTime: string, endTime: string, color: string, taskId?: string | null) => Promise<Appointment>;
  onUpdateAppointment: (id: string, updates: UpdateAppointmentData) => Promise<Appointment>;
  onDeleteAppointment: (id: string) => Promise<void>;
  onAddTask: (description: string, sectionId: string | null, parentTaskId: string | null, dueDate: Date | null, categoryId: string | null, priority: string) => Promise<Task>;
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  onUpdateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection>;
  showFocusTasksOnly: boolean;
  doTodayOffLog: DoTodayOffLogEntry[] | undefined;
}

export interface DailyTasksHeaderProps {
  onAddTask: (description: string, sectionId: string | null, parentTaskId: string | null, dueDate: Date | null, categoryId: string | null, priority: string) => Promise<Task>;
  onRefreshTasks: () => void;
  tasks: Task[];
  categories: TaskCategory[];
  sections: TaskSection[];
  doTodayOffLog: DoTodayOffLogEntry[] | undefined;
}

export interface DraggableScheduleTaskItemProps {
  id: string;
  task: Task;
  categories: TaskCategory[];
  sections: TaskSection[];
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  isDragging?: boolean;
  doTodayOffLog: DoTodayOffLogEntry[] | undefined;
}

export interface CommandPaletteProps {
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (isOpen: boolean) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

export interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isDemo?: boolean;
  demoUserId?: string;
  setIsCommandPaletteOpen: (isOpen: boolean) => void;
}

export interface DraggableAppointmentCardProps {
  id: string;
  appointment: Appointment;
  task?: Task;
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: string) => Promise<void>;
  trackIndex: number;
  totalTracks: number;
  style?: React.CSSProperties;
  isDragging?: boolean;
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
  tasks: Task[]; // For rendering subtasks
  doTodayOffLog: DoTodayOffLogEntry[] | undefined;
}