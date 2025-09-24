import { supabase } from './client';
import { format } from 'date-fns';
import { Category } from '@/hooks/useTasks'; // Assuming Category type is consistent

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const parseAppointmentText = async (text: string, date: Date) => {
  try {
    const { data, error } = await supabase.functions.invoke('parse-appointment-text', {
      body: { text, date: format(date, 'yyyy-MM-dd') },
      headers: corsHeaders,
    });
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error invoking parse-appointment-text:', error.message);
    return null;
  }
};

export const suggestTaskDetails = async (prompt: string, categories: Category[], currentDate: Date) => {
  try {
    const { data, error } = await supabase.functions.invoke('suggest_task_details', {
      body: { prompt, categories, currentDate: format(currentDate, 'yyyy-MM-dd') },
      headers: corsHeaders,
    });
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error invoking suggest_task_details:', error.message);
    return null;
  }
};

export const getDailyBriefing = async (userId: string, date: Date) => {
  try {
    const { data, error } = await supabase.functions.invoke('daily-briefing', {
      body: { userId, date: format(date, 'yyyy-MM-dd') },
      headers: corsHeaders,
    });
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error invoking daily-briefing:', error.message);
    return null;
  }
};

export const getHabitChallengeSuggestion = async (userId: string, habitId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('habit-challenge-suggestion', {
      body: { userId, habitId },
      headers: corsHeaders,
    });
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error invoking habit-challenge-suggestion:', error.message);
    return null;
  }
};

export const suggestGoalDetails = async (prompt: string, categories: Category[], currentDate: Date) => {
  try {
    const { data, error } = await supabase.functions.invoke('suggest_goal_details', {
      body: { prompt, categories, currentDate: format(currentDate, 'yyyy-MM-dd') },
      headers: corsHeaders,
    });
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error invoking suggest_goal_details:', error.message);
    return null;
  }
};