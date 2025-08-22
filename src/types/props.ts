import { Task, TaskSection, TaskCategory, DailyTaskCount, TaskStatus, RecurringType, TaskPriority, Appointment, Project, UserSettings, WorkHour, QuickLink, WeeklyFocus, GratitudeJournalEntry, WorryJournalEntry, SleepRecord, PeopleMemory, CustomDashboardCard } from './task';

export interface AddTaskFormProps {
  onAddTask: (taskData: Partial<Task>) => Promise<Task | null>;
  onTaskAdded?: () => void;
  sections: TaskSection[];
  allCategories: TaskCategory[];
  currentDate: Date;
  createSection: (name: string) => Promise<TaskSection | null>;
  updateSection: (sectionId: string, newName: string) => Promise<TaskSection | null>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection | null>;
  initialData?: Partial<Task> | null;
}

export interface ManageSectionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sections: TaskSection[];
  createSection: (name: string) => Promise<TaskSection | null>;
  updateSection: (sectionId: string, newName: string) => Promise<TaskSection | null>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection | null>;
}

export interface ManageCategoriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: TaskCategory[];
  createCategory: (name: string, color: string) => Promise<TaskCategory | null>;
  updateCategory: (categoryId: string, newName: string, newColor: string) => Promise<TaskCategory | null>;
  deleteCategory: (categoryId: string) => Promise<void>;
}

export interface TaskListProps {
  tasks: Task[];
  processedTasks: Task[];
  sections: TaskSection[];
  categories: TaskCategory[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<Task | null>;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  onDelete: (taskId: string) => Promise<void>;
  onOpenOverview: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
  onAddTask: (taskData: Partial<Task>) => Promise<Task | null>;
  onReorderTasks: (updates: { id: string; order: number | null; section_id: string | null; parent_task_id: string | null; }[]) => Promise<void>;
  showDoTodayToggle?: boolean;
  toggleDoToday?: (taskId: string, isOff: boolean) => Promise<void>;
  doTodayOffIds?: Set<string>;
  isDemo?: boolean;
  nextAvailableTask?: Task | null;
  currentDate: Date;
  createSection: (name: string) => Promise<TaskSection | null>;
  updateSection: (sectionId: string, newName: string) => Promise<TaskSection | null>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection | null>;
  archiveAllCompletedTasks: () => Promise<void>;
  toggleAllDoToday: (turnOff: boolean) => Promise<void>;
  setIsAddTaskDialogOpen: (isOpen: boolean) => void;
  setPrefilledTaskData: (data: Partial<Task> | null) => void;
  dailyProgress: DailyTaskCount;
  onOpenFocusView: (task: Task) => void;
  statusFilter: TaskStatus | 'all';
  setStatusFilter: (value: TaskStatus | 'all') => void;
  categoryFilter: string | 'all' | null;
  setCategoryFilter: (value: string | 'all' | null) => void;
  priorityFilter: TaskPriority | 'all';
  setPriorityFilter: (value: TaskPriority | 'all') => void;
  sectionFilter: string | 'all' | null;
  setSectionFilter: (value: string | 'all' | null) => void;
}

export interface DailyTasksHeaderProps {
  dailyProgress: DailyTaskCount;
  toggleAllDoToday: (turnOff: boolean) => Promise<void>;
  showTodayTasks: () => void;
  currentDate: Date;
  sections: TaskSection[];
  allCategories: TaskCategory[];
  createSection: (name: string) => Promise<TaskSection | null>;
  updateSection: (sectionId: string, newName: string) => Promise<TaskSection | null>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection | null>;
  createCategory: (name: string, color: string) => Promise<TaskCategory | null>;
  updateCategory: (categoryId: string, newName: string, newColor: string) => Promise<TaskCategory | null>;
  deleteCategory: (categoryId: string) => Promise<void>;
  onAddTask: (taskData: Partial<Task>) => Promise<Task | null>;
  setPrefilledTaskData: (data: Partial<Task> | null) => void;
  isDemo?: boolean;
}

export interface NextTaskCardProps {
  nextAvailableTask: Task | null;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  onOpenOverview: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
  sections: TaskSection[];
  categories: TaskCategory[];
  isDemo?: boolean;
}

export interface FocusModeProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface TaskCalendarProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface ArchivePageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface DraggableAppointmentCardProps {
  appointment: Appointment;
  task?: Task;
  onClick: (appointment: Appointment) => void;
  className?: string;
}

export interface TimeBlockActionMenuProps {
  block: { start: Date; end: Date };
  onAddAppointment: (block: { start: Date; end: Date }) => void;
  onScheduleTask: (taskId: string, blockStart: Date) => void;
  unscheduledTasks: Task[];
  sections: TaskSection[];
}

export interface TaskOverviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onOpenDetail: (task: Task) => void;
  onOpenFocusView: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  deleteTask: (taskId: string) => Promise<void>;
  sections: TaskSection[];
  categories: TaskCategory[];
  allTasks: Task[];
  onAddTask: (taskData: Partial<Task>) => Promise<Task | null>;
  onReorderTasks: (updates: { id: string; order: number | null; section_id: string | null; parent_task_id: string | null; }[]) => Promise<void>;
  createSection: (name: string) => Promise<TaskSection | null>;
  updateSection: (sectionId: string, newName: string) => Promise<TaskSection | null>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection | null>;
  createCategory: (name: string, color: string) => Promise<TaskCategory | null>;
  updateCategory: (categoryId: string, newName: string, newColor: string) => Promise<TaskCategory | null>;
  deleteCategory: (categoryId: string) => Promise<void>;
}

export interface TaskDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  allTasks: Task[];
  sections: TaskSection[];
  categories: TaskCategory[];
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  onDelete: (taskId: string) => Promise<void>;
  onAddTask: (taskData: Partial<Task>) => Promise<Task | null>;
  onReorderTasks: (updates: { id: string; order: number | null; section_id: string | null; parent_task_id: string | null; }[]) => Promise<void>;
  createSection: (name: string) => Promise<TaskSection | null>;
  updateSection: (sectionId: string, newName: string) => Promise<TaskSection | null>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection | null>;
  createCategory: (name: string, color: string) => Promise<TaskCategory | null>;
  updateCategory: (categoryId: string, newName: string, newColor: string) => Promise<TaskCategory | null>;
  deleteCategory: (categoryId: string) => Promise<void>;
}

export interface FullScreenFocusViewProps {
  task: Task;
  onClose: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onOpenDetail: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  sections: TaskSection[];
  categories: TaskCategory[];
  allTasks: Task[];
  onAddTask: (taskData: Partial<Task>) => Promise<Task | null>;
  onReorderTasks: (updates: { id: string; order: number | null; section_id: string | null; parent_task_id: string | null; }[]) => Promise<void>;
  createSection: (name: string) => Promise<TaskSection | null>;
  updateSection: (sectionId: string, newName: string) => Promise<TaskSection | null>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection | null>;
  createCategory: (name: string, color: string) => Promise<TaskCategory | null>;
  updateCategory: (categoryId: string, newName: string, newColor: string) => Promise<TaskCategory | null>;
  deleteCategory: (categoryId: string) => Promise<void>;
}

export interface DailyScheduleViewProps {
  isDemo?: boolean;
  onOpenTaskOverview: (task: Task) => void;
  currentViewDate: Date;
  daysInGrid: Date[];
  allWorkHours: WorkHour[];
  saveWorkHours: (hoursToSave: WorkHour | WorkHour[]) => Promise<void>;
  appointments: Appointment[];
  tasks: Task[];
  sections: TaskSection[];
  categories: TaskCategory[];
  addAppointment: (appointmentData: Partial<Appointment>) => Promise<Appointment | null>;
  updateAppointment: (appointmentId: string, updates: Partial<Appointment>) => Promise<Appointment | null>;
  deleteAppointment: (appointmentId: string) => Promise<void>;
  onAddTask: (taskData: Partial<Task>) => Promise<Task | null>;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  onOpenTaskDetail: (task: Task) => void;
  isLoading: boolean;
}

export interface ScheduleGridContentProps {
  isDemo?: boolean;
  onOpenTaskOverview: (task: Task) => void;
  currentViewDate: Date;
  daysInGrid: Date[];
  allWorkHours: WorkHour[];
  saveWorkHours: (hoursToSave: WorkHour | WorkHour[]) => Promise<void>;
  appointments: Appointment[];
  tasks: Task[];
  sections: TaskSection[];
  categories: TaskCategory[];
  addAppointment: (appointmentData: Partial<Appointment>) => Promise<Appointment | null>;
  updateAppointment: (appointmentId: string, updates: Partial<Appointment>) => Promise<Appointment | null>;
  deleteAppointment: (appointmentId: string) => Promise<void>;
  onAddTask: (taskData: Partial<Task>) => Promise<Task | null>;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  onOpenTaskDetail: (task: Task) => void;
  isLoading: boolean;
}

export interface TaskItemProps {
  task: Task;
  allTasks: Task[];
  sections: TaskSection[];
  categories: TaskCategory[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<Task | null>;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  onDelete: (taskId: string) => Promise<void>;
  onOpenOverview: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
  onAddTask: (taskData: Partial<Task>) => Promise<Task | null>;
  onReorderTasks: (
    updates: {
      id: string;
      order: number | null;
      section_id: string | null;
      parent_task_id: string | null;
    }[]
  ) => Promise<void>;
  showDoTodayToggle?: boolean;
  toggleDoToday?: (taskId: string, isOff: boolean) => Promise<void>;
  isDoTodayOff?: boolean;
  level?: number; // For subtasks indentation
  isDemo?: boolean;
}

export interface TaskFilterProps {
  statusFilter: TaskStatus | 'all';
  setStatusFilter: (value: TaskStatus | 'all') => void;
  categoryFilter: string | 'all' | null;
  setCategoryFilter: (value: string | 'all' | null) => void;
  priorityFilter: TaskPriority | 'all';
  setPriorityFilter: (value: TaskPriority | 'all') => void;
  sectionFilter: string | 'all' | null;
  setSectionFilter: (value: string | 'all' | null) => void;
  sections: TaskSection[];
  categories: TaskCategory[];
}

export interface FocusToolsPanelProps {
  currentTask: Task | null;
  onCompleteCurrentTask: () => void;
  onSkipCurrentTask: () => void;
  onOpenDetail: (task: Task) => void;
  onOpenOverview: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  sections: TaskSection[];
  allCategories: TaskCategory[];
  handleAddTask: (taskData: Partial<Task>) => Promise<Task | null>;
  currentDate: Date;
  isDemo?: boolean;
}

export interface FocusPanelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTask: Task | null;
  onCompleteCurrentTask: () => void;
  onSkipCurrentTask: () => void;
  onOpenDetail: (task: Task) => void;
  onOpenOverview: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  sections: TaskSection[];
  allCategories: TaskCategory[];
  handleAddTask: (taskData: Partial<Task>) => Promise<Task | null>;
  currentDate: Date;
  isDemo?: boolean;
}

export interface DailyTasksV3Props {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface SidebarProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface DashboardStats {
  loading: boolean;
  tasksDue: number;
  tasksCompleted: number;
  appointmentsToday: number;
}

export interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  sectionTitle: string;
  addProject: (name: string, description: string | null, link: string | null) => Promise<Project | null>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<Project | null>;
  deleteProject: (projectId: string) => Promise<void>;
  incrementProjectCount: (projectId: string) => Promise<void>;
  decrementProjectCount: (projectId: string) => Promise<void>;
  sortOption: string;
  setSortOption: (option: string) => void;
}

export interface SettingsContextType {
  settings: UserSettings | null;
  loading: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<UserSettings | null>;
}

export interface CustomDashboardCardProps {
  card: CustomDashboardCard;
}

export interface ProjectBalanceCardProps {
  projects: Project[];
  title: string;
}

export interface QuickLinksCardProps {
  quickLinks: QuickLink[];
  isLoading: boolean;
  addQuickLink: (title: string, url: string, emoji: string | null, backgroundColor: string | null) => Promise<QuickLink | null>;
  updateQuickLink: (linkId: string, updates: Partial<QuickLink>) => Promise<QuickLink | null>;
  deleteQuickLink: (linkId: string) => Promise<void>;
}

export interface WeeklyFocusCardProps {
  weeklyFocus: WeeklyFocus | null;
  isLoading: boolean;
  updateWeeklyFocus: (updates: Partial<WeeklyFocus>) => Promise<WeeklyFocus | null>;
}

export interface GratitudeJournalCardProps {
  entries: GratitudeJournalEntry[];
  isLoading: boolean;
  addEntry: (entry: string) => Promise<GratitudeJournalEntry | null>;
  deleteEntry: (entryId: string) => Promise<void>;
}

export interface WorryJournalCardProps {
  entries: WorryJournalEntry[];
  isLoading: boolean;
  addEntry: (thought: string) => Promise<WorryJournalEntry | null>;
  deleteEntry: (entryId: string) => Promise<void>;
}

export interface SleepTrackerCardProps {
  sleepRecords: SleepRecord[];
  isLoading: boolean;
  addSleepRecord: (record: Partial<SleepRecord>) => Promise<SleepRecord | null>;
  updateSleepRecord: (recordId: string, updates: Partial<SleepRecord>) => Promise<SleepRecord | null>;
  deleteSleepRecord: (recordId: string) => Promise<void>;
}

export interface PeopleMemoryCardProps {
  people: PeopleMemory[];
  isLoading: boolean;
  addPerson: (name: string, notes: string | null, avatarUrl: string | null) => Promise<PeopleMemory | null>;
  updatePerson: (personId: string, updates: Partial<PeopleMemory>) => Promise<PeopleMemory | null>;
  deletePerson: (personId: string) => Promise<void>;
}

export interface BulkActionBarProps {
  selectedTaskIds: Set<string>;
  onMarkComplete: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

export interface CategorySelectorProps {
  categories: TaskCategory[];
  selectedCategory: string | 'all' | null;
  onSelectCategory: (categoryId: string | 'all' | null) => void;
  createCategory: (name: string, color: string) => Promise<TaskCategory | null>;
  updateCategory: (categoryId: string, newName: string, newColor: string) => Promise<TaskCategory | null>;
  deleteCategory: (categoryId: string) => Promise<void>;
}

export interface DraggableTaskListItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  allTasks: Task[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onOpenOverview: (task: Task) => void;
}

export interface QuickAddTaskProps {
  onAddTask: (taskData: Partial<Task>) => Promise<Task | null>;
  sections: TaskSection[];
  allCategories: TaskCategory[];
  currentDate: Date;
  createSection: (name: string) => Promise<TaskSection | null>;
  updateSection: (sectionId: string, newName: string) => Promise<TaskSection | null>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection | null>;
}

export interface SectionSelectorProps {
  sections: TaskSection[];
  selectedSection: string | 'all' | null;
  onSelectSection: (sectionId: string | 'all' | null) => void;
  createSection: (name: string) => Promise<TaskSection | null>;
  updateSection: (sectionId: string, newName: string) => Promise<TaskSection | null>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection | null>;
}

export interface SortableTaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => Promise<void>;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  allTasks: Task[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<Task | null>;
  onOpenOverview: (task: Task) => void;
}

export interface TimeBlockProps {
  block: { start: Date; end: Date };
  appointments: Appointment[];
  tasks: Task[];
  sections: TaskSection[];
  onAddAppointment: (block: { start: Date; end: Date }) => void;
  onScheduleTask: (taskId: string, blockStart: Date) => void;
  onOpenAppointmentDetail: (appointment: Appointment) => void;
  onOpenTaskDetail: (task: Task) => void;
  unscheduledTasks: Task[];
}