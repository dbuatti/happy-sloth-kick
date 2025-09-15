import { Task } from '@/hooks/useTasks';

// Helper function to clean task data before sending to Supabase
export const cleanTaskForDb = (task: Partial<Task>) => {
  const cleaned: any = { ...task };
  // Remove client-side only properties
  delete cleaned.category_color;
  // Ensure UUIDs are not empty strings if they are meant to be null
  if (cleaned.category === '') cleaned.category = null;
  if (cleaned.section_id === '') cleaned.section_id = null;
  if (cleaned.parent_task_id === '') cleaned.parent_task_id = null;
  if (cleaned.original_task_id === '') cleaned.original_task_id = null;
  if (cleaned.link === '') cleaned.link = null;
  if (cleaned.image_url === '') cleaned.image_url = null;
  if (cleaned.description === '') cleaned.description = null;
  if (cleaned.notes === '') cleaned.notes = null;
  return cleaned;
};