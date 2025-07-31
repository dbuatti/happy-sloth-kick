import { supabase } from './client';
import { format } from 'date-fns'; // Import format

interface SuggestTaskDetailsResponse {
  category: string;
  priority: string;
  dueDate: string | null; // ISO string
  remindAt: string | null; // ISO string
  section: string | null;
  cleanedDescription: string;
}

export const suggestTaskDetails = async (description: string, categories: { id: string; name: string }[], currentDate: Date): Promise<SuggestTaskDetailsResponse | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('suggest-task-details', {
      body: { 
        description, 
        categories,
        currentDate: format(currentDate, 'yyyy-MM-dd'), // Pass current date as YYYY-MM-DD
      },
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