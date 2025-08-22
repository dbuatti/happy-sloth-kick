import {
  Task,
  TaskSection,
  TaskCategory,
  DailyTaskCount,
  Project,
  UserSettings,
  WorkHour,
  Appointment,
  TaskStatus,
  TaskPriority,
} from './task';
import { Dispatch, SetStateAction } from 'react';

// --- General Props ---
export interface BasePageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface TaskManagementProps {
  sections: TaskSection[];
  allCategories: TaskCategory[];
  createSection: (name: string) => Promise<TaskSection | null>;
  updateSection: (sectionId: string, newName: string) => Promise<TaskSection | null>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection | null>;
  createCategory: (name: string, color: string) => Promise<TaskCategory | null>;
  updateCategory: (categoryId: string, newName: string, newColor: string) => Promise<TaskCategory | null>;
  deleteCategory: (categoryId: string) => Promise<void>;
}

export interface TaskActionProps {
  onAddTask: (taskData: Partial<Task>) => Promise<Task | null>;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  onDelete: (taskId: string) => Promise<void>;
  onReorderTasks: (updates: { id: string; order: number | null; section_id: string | null; parent_task_id: string | null; }[]) => Promise<void>;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<Task | null>;
}

// --- Component Specific Props ---

export interface AddTaskFormProps extends TaskManagementProps, TaskActionProps {
  onTaskAdded?: () => void;
  currentDate: Date;
  initialData?: Partial<Task> | null;
}

export interface DailyTasksHeaderProps extends TaskManagementProps, TaskActionProps {
  dailyProgress: DailyTaskCount;
  toggleAllDoToday: (turnOff: boolean) => Promise<void>;
  showTodayTasks: () => void;
  currentDate: Date;
  setPrefilledTaskData: (data: Partial<Task> | null) => void;
  isDemo?: boolean;
}

export interface TaskFilterProps extends TaskManagementProps {
  statusFilter: TaskStatus | 'all';
  setStatusFilter: Dispatch<SetStateAction<TaskStatus | 'all'>>;
  categoryFilter: string | 'all' | null;
  setCategoryFilter: Dispatch<SetStateAction<string | 'all' | null>>;
  priorityFilter: TaskPriority | 'all' | null;
  setPriorityFilter: Dispatch<SetStateAction<TaskPriority | 'all' | null>>;
  sectionFilter: string | 'all' | null;
  setSectionFilter: Dispatch<SetStateAction<string | 'all' | null>>;
}

export interface TaskListProps extends TaskManagementProps, TaskActionProps {
  tasks: Task[];
  processedTasks: (Task & { isOverdue: boolean; isDueToday: boolean })[];
  onOpenOverview: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
  showDoTodayToggle?: boolean;
  toggleDoToday?: (taskId: string, isOff: boolean) => Promise<void>;
  doTodayOffIds?: Set<string>;
  isDemo?: boolean;
  nextAvailableTask: Task | null;
  currentDate: Date;
  archiveAllCompletedTasks: () => Promise<void>;
  toggleAllDoToday: (turnOff: boolean) => Promise<void>;
  setIsAddTaskDialogOpen: (isOpen: boolean) => void;
  setPrefilledTaskData: (data: Partial<Task> | null) => void;
  dailyProgress: DailyTaskCount;
  onOpenFocusView: (task: Task) => void;
  statusFilter: TaskStatus | 'all';
  setStatusFilter: Dispatch<SetStateAction<TaskStatus | 'all'>>;
  categoryFilter: string | 'all' | null;
  setCategoryFilter: Dispatch<SetStateAction<string | 'all' | null>>;
  priorityFilter: TaskPriority | 'all' | null;
  setPriorityFilter: Dispatch<SetStateAction<TaskPriority | 'all' | null>>;
  sectionFilter: string | 'all' | null;
  setSectionFilter: Dispatch<SetStateAction<string | 'all' | null>>;
}

export interface TaskItemProps extends TaskManagementProps, TaskActionProps {
  task: Task;
  allTasks: Task[];
  onOpenOverview: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
  showDoTodayToggle?: boolean;
  toggleDoToday?: (taskId: string, isOff: boolean) => Promise<void>;
  isDoTodayOff?: boolean;
  level?: number;
  isDemo?: boolean;
}

export interface TaskOverviewDialogProps extends TaskManagementProps, TaskActionProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onOpenDetail: (task: Task) => void;
  onOpenFocusView: (task: Task) => void;
  allTasks: Task[];
}

export interface TaskDetailDialogProps extends TaskManagementProps, TaskActionProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  allTasks: Task[];
}

export interface FullScreenFocusViewProps extends TaskManagementProps, TaskActionProps {
  task: Task;
  onClose: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onOpenDetail: (task: Task) => void;
  allTasks: Task[];
}

export interface DraggableTaskListItemProps extends TaskManagementProps, TaskActionProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => Promise<void>;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  allTasks: Task[];
  onOpenOverview: (task: Task) => void;
}

export interface SortableTaskItemProps extends DraggableTaskListItemProps {}

export interface QuickAddTaskProps extends TaskManagementProps, TaskActionProps {
  currentDate: Date;
  setPrefilledTaskData: (data: Partial<Task> | null) => void;
}

export interface CategorySelectorProps extends TaskManagementProps {
  selectedCategory: string | 'all' | null;
  onSelectCategory: (categoryId: string | 'all' | null) => void;
}

export interface SectionSelectorProps extends TaskManagementProps {
  selectedSection: string | 'all' | null;
  onSelectSection: (sectionId: string | 'all' | null) => void;
}

export interface ManageSectionsDialogProps extends TaskManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ManageCategoriesDialogProps extends TaskManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface TimeBlockProps {
  block: { start: Date; end: Date };
  appointments: Appointment[];
  tasks: Task[];
  sections: TaskSection[];
  onAddAppointment: (block: { start: Date; end: Date }) => void;
  onScheduleTask: (taskId: string, blockStart: Date) => Promise<void>;
  onOpenAppointmentDetail: (app: Appointment) => void;
  onOpenTaskDetail: (task: Task) => void;
  unscheduledTasks: Task[];
}

export interface ScheduleGridContentProps {
  day: Date;
  timeBlocks: { start: Date; end: Date }[];
  appointments: Appointment[];
  tasks: Task[];
  sections: TaskSection[];
  onAddAppointment: (block: { start: Date; end: Date }) => void;
  onScheduleTask: (taskId: string, blockStart: Date) => Promise<void>;
  onOpenAppointmentDetail: (app: Appointment) => void;
  onOpenTaskDetail: (task: Task) => void;
  unscheduledTasks: Task[];
}

export interface DailyScheduleViewProps extends TaskActionProps, TaskManagementProps {
  isDemo?: boolean;
  onOpenTaskOverview: (task: Task) => void;
  currentViewDate: Date;
  allWorkHours: WorkHour[];
  saveWorkHours: (hoursToSave: WorkHour | WorkHour[]) => Promise<void>;
  appointments: Appointment[];
  tasks: Task[];
  isLoading: boolean;
}

export interface FocusToolsPanelProps extends TaskManagementProps, TaskActionProps {
  currentTask: Task | null;
  onCompleteTask: () => Promise<void>;
  onSkipTask: () => Promise<void>;
  onOpenTaskDetail: (task: Task) => void;
  onAddSubtask: () => Promise<void>;
  newSubtaskDescription: string;
  setNewSubtaskDescription: Dispatch<SetStateAction<string>>;
  subtasks: Task[];
  allTasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onOpenTaskOverview: (task: Task) => void;
}

export interface ProjectNotesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSaveNotes: (notes: string) => Promise<void>;
}

export interface BulkActionBarProps {
  selectedTaskIds: Set<string>;
  onMarkComplete: () => Promise<void>;
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
  onClearSelection: () => void;
}

export interface WorkHourState {
  id?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  enabled: boolean;
}

export interface SidebarProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export interface DashboardStats {
  tasksDueToday: number;
  appointmentsToday: number;
}

export interface NextTaskCardProps {
  nextAvailableTask: Task | null;
  sections: TaskSection[];
  allCategories: TaskCategory[];
  onOpenOverview: (task: Task) => void;
  onOpenFocusView: (task: Task) => void;
}

export interface CustomDashboardCardProps {
  card: CustomDashboardCard;
  onEdit: (card: CustomDashboardCard) => void;
  onDelete: (cardId: string) => Promise<void>;
  onReorder: (cardId: string, newOrder: number) => Promise<void>;
}

export interface ProjectBalanceCardProps {
  project: Project;
  onIncrement: (projectId: string) => Promise<void>;
  onDecrement: (projectId: string) => Promise<void>;
  onDelete: (projectId: string) => Promise<void>;
  onEditNotes: (project: Project) => void;
  totalCount: number;
}

export interface FocusPanelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTask: Task | null;
  onCompleteTask: () => Promise<void>;
  onSkipTask: () => Promise<void>;
  onOpenDetail: (task: Task) => void;
  onOpenOverview: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  sections: TaskSection[];
  allCategories: TaskCategory[];
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

export interface TimeBlockActionMenuProps {
  block: { start: Date; end: Date };
  onAddAppointment: (block: { start: Date; end: Date }) => void;
  onScheduleTask: (taskId: string, blockStart: Date) => Promise<void>;
  unscheduledTasks: Task[];
  sections: TaskSection[];
}

// --- Page Props ---
export interface DashboardPageProps extends BasePageProps {}
export interface MyHubPageProps extends BasePageProps {}
export interface CalendarPageProps extends BasePageProps {}
export interface ArchivePageProps extends BasePageProps {}
export interface SettingsPageProps extends BasePageProps {}
export interface HelpPageProps extends BasePageProps {}
export interface ProjectBalanceTrackerPageProps extends BasePageProps {}
export interface DailyTasksV3PageProps extends BasePageProps {}
export interface TaskCalendarPageProps extends BasePageProps {}
export interface TimeBlockSchedulePageProps extends BasePageProps {}
export interface SleepPageProps extends BasePageProps {}
export interface SleepDiaryViewProps extends BasePageProps {}
export interface TasksPageProps extends BasePageProps {}

// --- Hook Context Types ---
export interface ProjectContextType {
  projects: Project[];
  isLoading: boolean;
  error: Error | null;
  sectionTitle: string;
  addProject: (name: string, description: string | null, link: string | null) => Promise<Project | null>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<Project | null>;
  deleteProject: (projectId: string) => Promise<void>;
  incrementProjectCount: (projectId: string) => Promise<void>;
  decrementProjectCount: (projectId: string) => Promise<void>;
  resetAllProjectCounts: () => Promise<void>;
  sortOption: string;
  setSortOption: Dispatch<SetStateAction<string>>;
}

export interface SettingsContextType {
  settings: UserSettings | null;
  isLoading: boolean;
  error: Error | null;
  updateSettings: (updates: Partial<UserSettings>) => Promise<UserSettings | null>;
}