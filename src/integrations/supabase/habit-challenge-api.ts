import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export const getHabitChallengeSuggestion = async (userId: string, habitId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('suggest-habit-challenge', {
      body: { userId, habitId },
    });

    if (error) {
      console.error('Error invoking suggest-habit-challenge Edge Function:', error);
      showError('Failed to get habit challenge suggestion.');
      return null;
    }

    return data.suggestion || null;
  } catch (error: any) {
    console.error('Error fetching habit challenge suggestion:', error);
    showError('Failed to get habit challenge suggestion.');
    return null;
  }
};