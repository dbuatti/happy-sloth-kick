import { type UserSettings } from '@/hooks/useUserSettings';

export interface Task {
  id: string;
  description: string | null;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  created_at: string;
  updated_at: string;
  user_id: string;
  category: string;
  category_color: string; // Client-side only, derived from category ID
  priority: 'low' | 'medium' | 'high' | 'urgent' | string;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number | null;
  original_task_id: string | null; // For recurring task instances
  parent_task_id: string | null; // For sub-tasks
  link: string | null;
  image_url: string | null;
}

export interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
  include_in_focus_mode: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

export type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'category_color'>>;

export interface NewTaskData {
  description: string;
  status?: Task['status'];
  recurring_type?: Task['recurring_type'];
  category: string;
  priority?: Task['priority'];
  due_date?: string | null;
  notes?: string | null;
  remind_at?: string | null;
  section_id?: string | null;
  parent_task_id?: string | null;
  original_task_id?: string | null;
  created_at?: string;
  link?: string | null;
  image_url?: string | null;
}

export interface DailyProgress {
  totalCount: number;
  completedCount: number;
  overdueCount: number;
}

export interface UseTasksOptions {
  currentDate: Date;
  viewMode?: 'daily' | 'archive' | 'focus';
  userId?: string;
}

export interface TaskFilteringState {
  searchFilter: string;
  statusFilter: string;
  categoryFilter: string;
  priorityFilter: string;
  sectionFilter: string;
}

export interface TaskFilteringSetters {
  setSearchFilter: (value: string) => void;
  setStatusFilter: (value: string) => void;
  setCategoryFilter: (value: string) => void;
  setPriorityFilter: (value: string) => void;
  setSectionFilter: (value: string) => void;
}

export interface TaskMutationFunctions {
  handleAddTask: (newTaskData: NewTaskData) => Promise<boolean>;
  updateTask: (taskId: string, updates: TaskUpdate) => Promise<string | null>;
  deleteTask: (taskId: string) => Promise<void>;
  bulkUpdateTasks: (updates: TaskUpdate, ids: string[]) => Promise<void>;
  bulkDeleteTasks: (ids: string[]) => Promise<boolean>;
  archiveAllCompletedTasks: () => Promise<void>;
  markAllTasksInSectionCompleted: (sectionId: string | null) => Promise<void>;
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  reorderSections: (activeId: string, overId: string) => Promise<void>;
  updateTaskParentAndOrder: (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null, isDraggingDown: boolean) => Promise<void>;
  setFocusTask: (taskId: string | null) => Promise<void>;
  toggleDoToday: (task: Task) => Promise<void>;
  toggleAllDoToday: () => Promise<void>;
}