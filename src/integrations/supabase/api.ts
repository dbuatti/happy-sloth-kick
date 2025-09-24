import { format } from 'date-fns';
import { supabase } from './client';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Define a simplified category type for AI processing
export interface AICategory {
  id: string;
  name: string;
}

// Helper function to parse AI response (placeholder for actual AI parsing logic)
const parseAIResponse = (text: string) => {
  // This is a simplified parser. A real implementation would be more robust.
  const cleanedDescriptionMatch = text.match(/Description: (.+)/);
  const priorityMatch = text.match(/Priority: (.+)/);
  const categoryMatch = text.match(/Category: (.+)/);
  const dueDateMatch = text.match(/Due Date: (.+)/);
  const remindAtMatch = text.match(/Reminder: (.+)/);
  const notesMatch = text.match(/Notes: (.+)/);
  const linkMatch = text.match(/Link: (.+)/);
  const sectionMatch = text.match(/Section: (.+)/);

  return {
    cleanedDescription: cleanedDescriptionMatch ? cleanedDescriptionMatch[1].trim() : text,
    priority: priorityMatch ? priorityMatch[1].trim() : 'medium',
    category: categoryMatch ? categoryMatch[1].trim() : 'General',
    dueDate: dueDateMatch && dueDateMatch[1].trim() !== 'None' ? dueDateMatch[1].trim() : null,
    remindAt: remindAtMatch && remindAtMatch[1].trim() !== 'None' ? remindAtMatch[1].trim() : null,
    notes: notesMatch && notesMatch[1].trim() !== 'None' ? notesMatch[1].trim() : null,
    link: linkMatch && linkMatch[1].trim() !== 'None' ? linkMatch[1].trim() : null,
    section: sectionMatch && sectionMatch[1].trim() !== 'None' ? sectionMatch[1].trim() : null,
  };
};

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Function to suggest task details using AI
export const suggestTaskDetails = async (
  description: string,
  categories: AICategory[],
  currentDate: Date
) => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. AI suggestions will not work.");
    return null;
  }

  const formattedDate = format(currentDate, 'yyyy-MM-dd');
  const categoryNames = categories.map(cat => cat.name).join(', ');

  const prompt = `Given the task description: "${description}", and the current date is ${formattedDate}, suggest the following details. If a detail is not explicitly mentioned or inferable, use a reasonable default or 'None'.
  Available categories: ${categoryNames}.
  Priorities: low, medium, high, urgent.
  Sections: Today's Priorities, This Week, Future Ideas, No Section.

  Format the output as:
  Description: [cleaned description]
  Priority: [low/medium/high/urgent]
  Category: [category name]
  Due Date: [YYYY-MM-DD or None]
  Reminder: [YYYY-MM-DDTHH:MM:SSZ or None]
  Notes: [notes or None]
  Link: [URL or local file path or None]
  Section: [section name or None]
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    console.error("Error generating AI task suggestions:", error);
    return null;
  }
};

// Function to parse appointment text using AI
export const parseAppointmentText = async (
  text: string,
  currentDate: Date
) => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. AI parsing will not work.");
    return null;
  }

  const formattedDate = format(currentDate, 'yyyy-MM-dd');

  const prompt = `Parse the following text for appointment details. The current date is ${formattedDate}.
  Text: "${text}"

  Extract:
  Title: [short title]
  Description: [detailed description or None]
  Date: [YYYY-MM-DD]
  Start Time: [HH:MM]
  End Time: [HH:MM]

  If any detail is missing or ambiguous, use a reasonable default or 'None'. Ensure times are in 24-hour HH:MM format.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();

    const titleMatch = aiText.match(/Title: (.+)/);
    const descriptionMatch = aiText.match(/Description: (.+)/);
    const dateMatch = aiText.match(/Date: (.+)/);
    const startTimeMatch = aiText.match(/Start Time: (.+)/);
    const endTimeMatch = aiText.match(/End Time: (.+)/);

    if (!titleMatch || !dateMatch || !startTimeMatch || !endTimeMatch) {
      return null; // Essential details missing
    }

    return {
      title: titleMatch[1].trim(),
      description: descriptionMatch && descriptionMatch[1].trim() !== 'None' ? descriptionMatch[1].trim() : null,
      date: dateMatch[1].trim(),
      startTime: startTimeMatch[1].trim(),
      endTime: endTimeMatch[1].trim(),
    };
  } catch (error) {
    console.error("Error parsing appointment text with AI:", error);
    return null;
  }
};

// Function to get daily briefing using AI
export const getDailyBriefing = async (userId: string, date: Date) => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. AI briefing will not work.");
    return null;
  }

  const formattedDate = format(date, 'yyyy-MM-dd');

  try {
    // Fetch user's tasks and appointments for the day
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('description, status, priority, due_date, notes')
      .eq('user_id', userId)
      .or(`due_date.eq.${formattedDate},created_at.gte.${formattedDate}T00:00:00Z`); // Tasks due today or created today

    if (tasksError) throw tasksError;

    const { data: appointments, error: appointmentsError } = await supabase
      .from('schedule_appointments')
      .select('title, description, start_time, end_time')
      .eq('user_id', userId)
      .eq('date', formattedDate);

    if (appointmentsError) throw appointmentsError;

    let briefingContent = `Generate a concise daily briefing for ${formattedDate} based on the following user data:\n\n`;

    if (tasks && tasks.length > 0) {
      briefingContent += "Tasks:\n";
      tasks.forEach(task => {
        briefingContent += `- ${task.description} (Status: ${task.status}, Priority: ${task.priority}, Due: ${task.due_date || 'N/A'})\n`;
      });
      briefingContent += "\n";
    }

    if (appointments && appointments.length > 0) {
      briefingContent += "Appointments:\n";
      appointments.forEach(app => {
        briefingContent += `- ${app.title} (${app.start_time.substring(0, 5)} - ${app.end_time.substring(0, 5)}) - ${app.description || 'No description'}\n`;
      });
      briefingContent += "\n";
    }

    if (tasks.length === 0 && appointments.length === 0) {
      briefingContent += "No tasks or appointments found for today. Suggest a relaxing day or planning for tomorrow.\n";
    } else {
      briefingContent += "Summarize key priorities, upcoming events, and any potential conflicts or important notes. Keep it encouraging and actionable. Max 150 words.";
    }

    const result = await model.generateContent(briefingContent);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating AI daily briefing:", error);
    return null;
  }
};

// Function to get habit challenge suggestion using AI
export const getHabitChallengeSuggestion = async (userId: string, habitId: string) => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. AI suggestions will not work.");
    return null;
  }

  try {
    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('*')
      .eq('id', habitId)
      .eq('user_id', userId)
      .single();

    if (habitError) throw habitError;
    if (!habit) return null;

    const prompt = `Given the habit: "${habit.name}" (Description: ${habit.description || 'None'}, Frequency: ${habit.frequency}, Target: ${habit.target_value || 'None'} ${habit.unit || ''}), suggest a small, actionable challenge to help the user improve or stay consistent with this habit. The suggestion should be concise and encouraging, around 1-2 sentences.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating AI habit challenge suggestion:", error);
    return null;
  }
};

// Function to suggest goal details using AI
export const suggestGoalDetails = async (
  goalTitle: string,
  categories: AICategory[],
  currentDate: Date
) => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. AI suggestions will not work.");
    return null;
  }

  const formattedDate = format(currentDate, 'yyyy-MM-dd');
  const categoryNames = categories.map(cat => cat.name).join(', ');

  const prompt = `Given the goal title: "${goalTitle}", and the current date is ${formattedDate}, suggest the following details. If a detail is not explicitly mentioned or inferable, use a reasonable default or 'None'.
  Available categories: ${categoryNames}.
  Goal Types: daily, weekly, monthly, 3-month, 6-month, 9-month, yearly, 3-year, 5-year, 7-year, 10-year.

  Format the output as:
  Title: [cleaned title]
  Description: [detailed description or None]
  Category: [category name]
  Type: [goal type]
  Due Date: [YYYY-MM-DD or None]
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const parsed = parseAIResponse(text); // Re-use parseAIResponse for consistency

    const titleMatch = text.match(/Title: (.+)/);
    const typeMatch = text.match(/Type: (.+)/);

    return {
      title: titleMatch ? titleMatch[1].trim() : parsed.cleanedDescription,
      description: parsed.notes, // AI response uses 'Notes' for general description
      category: parsed.category,
      type: typeMatch ? typeMatch[1].trim() : 'yearly', // Default goal type
      dueDate: parsed.dueDate,
    };
  } catch (error) {
    console.error("Error generating AI goal suggestions:", error);
    return null;
  }
};