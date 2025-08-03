import React from 'react';
import TaskForm from './TaskForm';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
// Removed useAuth as it's not directly used in this component's logic

interface AddTaskFormProps {
  onAddTask: (taskData: {
    description: string;
    category: string;
    priority: string;
    due_date: string | null;
    notes: string | null;
    remind_at: string | null;
    section_id: string | null;
    recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
    parent_task_id: string | null;
  }) => Promise<any>;
  onTaskAdded?: () => void; // Callback for when task is successfully added
  sections: TaskSection[];
  allCategories: Category[];
  autoFocus?: boolean;
  preselectedSectionId?: string | null;
  parentTaskId?: string | null; // For sub-tasks
  currentDate: Date; // Added currentDate prop
  // New props for section management
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  initialData?: Partial<Task> | null;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({
  onAddTask,
  onTaskAdded,
  sections,
  allCategories,
  autoFocus,
  preselectedSectionId,
  parentTaskId,
  currentDate,
  createSection, // Destructure new props
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  initialData,
}) => {
  // Removed userId as it's not directly used in this component's logic
  // const { user } = useAuth(); 
  // const userId = user?.id || null; 

  const handleSave = async (taskData: Parameters<typeof onAddTask>[0]) => {
    const success = await onAddTask(taskData);
    if (success) {
      onTaskAdded?.();
    }
    return success;
  };

  return (
    <TaskForm
      initialData={initialData as Task | null}
      onSave={handleSave}
      onCancel={onTaskAdded || (() => {})} // If onTaskAdded is not provided, use a no-op
      sections={sections}
      allCategories={allCategories}
      autoFocus={autoFocus}
      preselectedSectionId={preselectedSectionId}
      parentTaskId={parentTaskId}
      currentDate={currentDate}
      createSection={createSection} // Pass new props
      updateSection={updateSection}
      deleteSection={deleteSection}
      updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
    />
  );
};

export default AddTaskForm;