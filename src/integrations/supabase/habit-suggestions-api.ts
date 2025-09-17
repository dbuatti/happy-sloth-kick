import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export const getNewHabitSuggestion = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('suggest-new-habit', {
      body: { userId },
    });

    if (error) {
      console.error('Error invoking suggest-new-habit Edge Function:', error);
      showError('Failed to get habit suggestion.');
      return null;
    }

    return data.suggestion || null;
  } catch (error: any) {
    console.error('Error fetching new habit suggestion:', error);
    showError('Failed to get habit suggestion.');
    return null;
  }
};