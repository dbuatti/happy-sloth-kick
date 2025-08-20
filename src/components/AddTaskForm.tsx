import React, { useState } from 'react';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import TaskForm from '@/components/TaskForm';

interface AddTaskFormProps {
  onAddTask: (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<boolean>;
  onTaskAdded?: () => void;
  sections: TaskSection[];
  allCategories: Category[];
  currentDate?: Date;
  createSection: (sectionData: Omit<TaskSection, 'id' | 'user_id' | 'created_at'>) => Promise<TaskSection | null>;
  updateSection: (id: string, updates: Partial<TaskSection>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (id: string, includeInFocusMode: boolean) => Promise<void>;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({
  onAddTask,
  onTaskAdded,
  sections,
  allCategories,
  currentDate,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
}) => {
  const [initialData] = useState<Partial<Task> | undefined>(undefined);

  const handleSave = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    const success = await onAddTask(taskData);
    if (success && onTaskAdded) {
      onTaskAdded();
    }
    return success;
  };

  const handleCancel = () => {
    if (onTaskAdded) {
      onTaskAdded();
    }
  };

  return (
    <TaskForm
      initialData={initialData}
      onSubmit={async (data) => {
        const result = await handleSave(data);
        return result;
      }}
      onCancel={handleCancel}
      sections={sections}
      allCategories={allCategories}
      currentDate={currentDate}
      createSection={createSection}
      updateSection={updateSection}
      deleteSection={deleteSection}
      updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
    />
  );
};

export default AddTaskForm;