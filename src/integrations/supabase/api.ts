import { format } from 'date-fns';

export interface AICategory {
  id: string;
  name: string;
}

// Define the expected structure of the AI suggestion result
export interface AISuggestionResult {
  cleanedDescription: string;
  category: string; // The name of the suggested category
  priority: 'low' | 'medium' | 'high' | 'urgent'; // Explicit priority types
  dueDate: string | null; // YYYY-MM-DD
  notes: string | null;
  remindAt: string | null; // ISO string
  section: string | null; // The name of the suggested section
  link: string | null;
}

// Placeholder functions for AI integration
export const suggestTaskDetails = async (
  description: string,
  categories: AICategory[],
  currentDate: Date
): Promise<AISuggestionResult | null> => { // Explicit return type
  console.log('API: Entering suggestTaskDetails...'); // NEW LOG
  // In a real scenario, this would call an AI service
  console.log('API: AI Suggestion for task:', description, 'with categories:', categories.map(c => c.name), 'on date:', format(currentDate, 'yyyy-MM-dd'));
  
  // Simulate AI response
  const defaultCategoryName = categories.length > 0 ? categories[0].name : 'General';

  const result: AISuggestionResult = { // Explicitly type the result object
    cleanedDescription: description,
    category: defaultCategoryName,
    priority: 'medium', // Default priority
    dueDate: null,
    notes: null,
    remindAt: null,
    section: null,
    link: null,
  };
  console.log('API: Exiting suggestTaskDetails with result:', result); // NEW LOG
  return result;
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