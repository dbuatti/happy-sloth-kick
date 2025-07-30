import React from 'react';
import TaskForm from './TaskForm';
import { TaskSection, Category } from '@/hooks/useTasks';

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
  userId: string | null;
  onTaskAdded?: () => void; // Callback for when task is successfully added
  sections: TaskSection[];
  allCategories: Category[];
  autoFocus?: boolean;
  preselectedSectionId?: string | null;
  parentTaskId?: string | null; // For sub-tasks
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({
  onAddTask,
  userId,
  onTaskAdded,
  sections,
  allCategories,
  autoFocus,
  preselectedSectionId,
  parentTaskId,
}) => {
  const handleSave = async (taskData: Parameters<typeof onAddTask>[0]) => {
    const success = await onAddTask(taskData);
    if (success) {
      onTaskAdded?.();
    }
    return success;
  };

  return (
    <TaskForm
      onSave={handleSave}
      onCancel={onTaskAdded || (() => {})} // If onTaskAdded is not provided, use a no-op
      userId={userId}
      sections={sections}
      allCategories={allCategories}
      autoFocus={autoFocus}
      preselectedSectionId={preselectedSectionId}
      parentTaskId={parentTaskId}
    />
  );
};

export default AddTaskForm;