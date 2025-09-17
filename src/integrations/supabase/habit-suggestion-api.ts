import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export const getNewHabitSuggestion = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('suggest-new-habit', {
      body: JSON.stringify({ userId }),
    });

    if (error) {
      console.error('Error invoking suggest-new-habit Edge Function:', error);
      showError('Failed to get habit suggestion from AI.');
      return null;
    }

    if (data && data.suggestion) {
      return data.suggestion;
    } else {
      console.error('Unexpected response from suggest-new-habit Edge Function:', data);
      showError('Received an unexpected response from the AI for habit suggestion.');
      return null;
    }
  } catch (error: any) {
    console.error('Client-side error calling suggest-new-habit:', error);
    showError(`An unexpected error occurred: ${error.message}`);
    return null;
  }
};