import { Task, TaskSection, TaskCategory, DailyTaskCount, TaskStatus, RecurringType, TaskPriority, Appointment } from './task';

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