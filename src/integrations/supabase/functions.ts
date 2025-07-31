import { supabase } from './client';

interface SuggestTaskDetailsResponse {
  category: string;
  priority: string;
  dueDate: string | null; // ISO string
  remindAt: string | null; // ISO string
  section: string | null;
  cleanedDescription: string;
}

export const suggestTaskDetails = async (description: string, categories: { id: string; name: string }[]): Promise<SuggestTaskDetailsResponse | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('suggest-task-details', {
      body: { description, categories },
    });

    if (error) {
      console.error('Error invoking suggest-task-details function:', error);
      throw error;
    }

    return data as SuggestTaskDetailsResponse;
  } catch (error) {
    console.error('Failed to get task suggestions:', error);
    return null;
  }
};