import React from 'react';
import TaskForm from './TaskForm';
import { Task, TaskSection, TaskCategory, NewTaskData, UpdateTaskData } from '@/types'; // Corrected imports

interface AddTaskFormProps {
  onAddTask: (data: NewTaskData) => Promise<Task>;
  onTaskAdded: () => void;
  categories: TaskCategory[];
  sections: TaskSection[];
  currentDate: Date;
  createSection: (data: NewTaskSectionData) => Promise<TaskSection>;
  updateSection: (data: { id: string; updates: UpdateTaskSectionData }) => Promise<TaskSection>;
  deleteSection: (id: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  showCompleted: boolean;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ onAddTask, onTaskAdded, categories, sections }) => {
  const handleSubmit = async (data: NewTaskData | UpdateTaskData) => {
    // Ensure data is NewTaskData for onAddTask
    const newTaskData: NewTaskData = {
      description: data.description,
      status: data.status || 'to-do',
      priority: data.priority || 'medium',
      due_date: data.due_date || null,
      notes: data.notes || null,
      remind_at: data.remind_at || null,
      section_id: data.section_id || null,
      parent_task_id: data.parent_task_id || null,
      recurring_type: data.recurring_type || 'none',
      category: data.category || null,
      link: data.link || null,
      image_url: data.image_url || null,
    };
    await onAddTask(newTaskData);
    onTaskAdded();
  };

  return (
    <TaskForm
      onSubmit={handleSubmit}
      onCancel={onTaskAdded}
      categories={categories}
      sections={sections}
    />
  );
};

export default AddTaskForm;