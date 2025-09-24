import { format } from 'date-fns';

export interface AICategory {
  id: string;
  name: string;
}

// Placeholder functions for AI integration
export const suggestTaskDetails = async (
  description: string,
  categories: AICategory[],
  currentDate: Date
) => {
  // In a real scenario, this would call an AI service
  console.log('AI Suggestion for task:', description, 'with categories:', categories.map(c => c.name), 'on date:', format(currentDate, 'yyyy-MM-dd'));
  return {
    cleanedDescription: description,
    category: categories.length > 0 ? categories[0].name : 'General',
    priority: 'medium',
    dueDate: null,
    notes: null,
    remindAt: null,
    section: null as string | null, // Explicitly type as string | null
    link: null,
  };
};

export const getDailyBriefing = async (userId: string, date: Date) => {
  console.log('Getting daily briefing for user:', userId, 'on date:', format(date, 'yyyy-MM-dd'));
  return "This is a placeholder daily briefing from AI.";
};

export const getHabitChallengeSuggestion = async (userId: string, habitId: string) => {
  console.log('Getting habit challenge suggestion for user:', userId, 'habit:', habitId);
  return "Try to complete your habit for 7 consecutive days!";
};

export const parseAppointmentText = async (text: string, date: Date) => {
  console.log('Parsing appointment text:', text, 'for date:', format(date, 'yyyy-MM-dd'));
  return {
    title: "Parsed Appointment",
    description: "Details from text",
    date: format(date, 'yyyy-MM-dd'),
    startTime: "09:00",
    endTime: "10:00",
  };
};