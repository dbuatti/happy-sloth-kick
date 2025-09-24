import { supabase } from './client';
import { format } from 'date-fns';
import { AICategory } from '@/types/ai'; // Assuming AICategory is defined here or in a similar types file

// Define AICategory if it's not already defined in a shared types file
// If it's already in '@/types/ai', then this can be removed.
export interface AICategory {
  id: string;
  name: string;
}

export async function suggestTaskDetails(description: string, categories: AICategory[], currentDate: Date) {
  try {
    const { data, error } = await supabase.functions.invoke('suggest-task-details', {
      body: { description, categories, currentDate: format(currentDate, 'yyyy-MM-dd') },
    });

    if (error) {
      console.error('Error invoking suggest-task-details:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Unexpected error in suggestTaskDetails:', error);
    return null;
  }
}

export async function getDailyBriefing(userId: string, date: Date) {
  try {
    const { data, error } = await supabase.functions.invoke('daily-briefing', {
      body: { userId, date: format(date, 'yyyy-MM-dd') },
    });

    if (error) {
      console.error('Error invoking daily-briefing:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Unexpected error in getDailyBriefing:', error);
    return null;
  }
}

export async function getHabitChallengeSuggestion(userId: string, habitId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('habit-challenge-suggestion', {
      body: { userId, habitId },
    });

    if (error) {
      console.error('Error invoking habit-challenge-suggestion:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Unexpected error in getHabitChallengeSuggestion:', error);
    return null;
  }
}

export async function parseAppointmentText(text: string, date: Date) {
  try {
    const { data, error } = await supabase.functions.invoke('parse-appointment-text', {
      body: { text, date: format(date, 'yyyy-MM-dd') },
    });

    if (error) {
      console.error('Error invoking parse-appointment-text:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Unexpected error in parseAppointmentText:', error);
    return null;
  }
}

export async function invokeGoalRollover() {
  try {
    const { data, error } = await supabase.functions.invoke('rollover-goals', {
      body: {}, // No specific body needed for this function
    });

    if (error) {
      console.error('Error invoking rollover-goals:', error);
      return null;
    }
    console.log('Goal rollover function invoked:', data);
    return data;
  } catch (error) {
    console.error('Unexpected error in invokeGoalRollover:', error);
    return null;
  }
}