import { Task } from '@/hooks/useTasks';

// Helper function to clean task data for database insertion/update
export const cleanTaskForDb = (task: Partial<Task>): Omit<Partial<Task>, 'category_color'> => {
  const cleaned: Omit<Partial<Task>, 'category_color'> = { ...task };
  // Remove client-side only fields
  if ('category_color' in cleaned) {
    delete (cleaned as any).category_color;
  }
  // Ensure optional fields are explicitly null if empty string or undefined
  if (cleaned.description === '') cleaned.description = null;
  if (cleaned.notes === '') cleaned.notes = null;
  if (cleaned.link === '') cleaned.link = null;
  if (cleaned.image_url === '') cleaned.image_url = null;
  if (cleaned.due_date === '') cleaned.due_date = null;
  if (cleaned.remind_at === '') cleaned.remind_at = null;
  if (cleaned.section_id === '') cleaned.section_id = null;
  if (cleaned.parent_task_id === '') cleaned.parent_task_id = null;
  if (cleaned.original_task_id === '') cleaned.original_task_id = null;
  if (cleaned.completed_at === '') cleaned.completed_at = null;
  
  return cleaned;
};