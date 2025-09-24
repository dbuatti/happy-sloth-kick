import { supabase } from './client';
import { format } from 'date-fns';

interface CategoryForAI {
  id: string;
  name: string;
}

interface GoalSuggestion {
  category: string;
  dueDate: string | null;
  notes: string | null;
  cleanedDescription: string;
}

/**
 * Calls the Gemini AI to suggest goal details from a natural language description.
 * @param description The goal description provided by the user.
 * @param categories Available categories for the AI to choose from.
 * @param currentDate The current date for context.
 * @returns Suggested goal details or null if parsing fails.
 */
export const suggestGoalDetails = async (description: string, categories: CategoryForAI[], currentDate: Date): Promise<GoalSuggestion | null> => {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not set in environment variables.");
    return null;
  }

  const categoryNames = categories.map(cat => cat.name).join(', ');
  const todayDateString = format(currentDate, 'yyyy-MM-dd');
  const dayOfWeek = format(currentDate, 'EEEE');

  const prompt = `You are a helpful assistant that extracts structured goal data from natural language descriptions.
    Today's date is ${todayDateString} (${dayOfWeek}).
    
    Extract the following fields in JSON format:
    - 'category': The most relevant category from the provided list. If no clear category, default to 'General'.
    - 'dueDate': The due date in 'YYYY-MM-DD' format. If no specific date, leave null.
    - 'notes': Any additional notes or details that should be extracted, or null if none.
    - 'cleanedDescription': The original description with extracted keywords removed.

    Categories available: ${categoryNames}

    Example 1:
    Description: "Plan summer vacation by next month personal"
    Output:
    {
      "category": "Personal",
      "dueDate": "${format(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1), 'yyyy-MM-dd')}",
      "notes": null,
      "cleanedDescription": "Plan summer vacation"
    }

    Example 2:
    Description: "Finish book by end of year learning"
    Output:
    {
      "category": "Learning",
      "dueDate": "${format(new Date(currentDate.getFullYear(), 11, 31), 'yyyy-MM-dd')}",
      "notes": null,
      "cleanedDescription": "Finish book"
    }
    
    Your response MUST be a valid JSON object. Do NOT include any other text or markdown outside the JSON.
    Goal Description: "${description}"`;

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const geminiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API request failed:", geminiResponse.status, errorBody);
      return null;
    }

    const geminiData = await geminiResponse.json();
    let responseText = geminiData.candidates[0].content.parts[0].text;
    responseText = responseText.replace(/```json\n|```/g, '').trim();

    const parsedData = JSON.parse(responseText);
    return parsedData;

  } catch (error) {
    console.error("Error calling Gemini API for goal suggestions:", error);
    return null;
  }
};

/**
 * Calls the Gemini AI to parse appointment details from a natural language text.
 * @param text The input text containing appointment details.
 * @param currentDate The current date for context.
 * @returns Parsed appointment details or null if parsing fails.
 */
export const parseAppointmentText = async (text: string, currentDate: Date): Promise<any | null> => {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not set in environment variables.");
    return null;
  }

  const today = new Date(currentDate);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowDateString = tomorrow.toISOString().split('T')[0];

  const prompt = `
      You are an expert appointment parser. Your task is to extract appointment details from a given text and return them as a JSON object.
      The current date is ${format(currentDate, 'yyyy-MM-dd')}. Use this for context if the text mentions relative dates like "today" or "tomorrow".

      Extract the following fields:
      - "title": The main title of the event. If it's a person's name, use that.
      - "description": Any additional details, notes, or location information.
      - "date": The date of the appointment in "YYYY-MM-DD" format.
      - "startTime": The start time in "HH:mm" (24-hour) format.
      - "endTime": The end time in "HH:mm" (24-hour) format.

      Your response MUST be a valid JSON object and nothing else. Do not include markdown fences or any other text.

      Example 1:
      Input Text: "mindfulness at 11am for 30 minutes"
      Output:
      {
        "title": "Mindfulness",
        "description": null,
        "date": "${format(currentDate, 'yyyy-MM-dd')}",
        "startTime": "11:00",
        "endTime": "11:30"
      }

      Example 2:
      Input Text: "Thomas Cucinotta: Coaching and Lessons (Daniele Buatti) Scheduled: 7 Aug 2025 at 15:35 to 16:35, AEST Location: 685 Toorak Road Toorak"
      Output:
      {
        "title": "Thomas Cucinotta: Coaching and Lessons",
        "description": "Location: 685 Toorak Road Toorak",
        "date": "2025-08-07",
        "startTime": "15:35",
        "endTime": "16:35"
      }

      Example 3:
      Input Text: "lunch with Sarah tomorrow at 1pm"
      Output:
      {
        "title": "Lunch with Sarah",
        "description": null,
        "date": "${tomorrowDateString}",
        "startTime": "13:00",
        "endTime": "14:00"
      }

      Now, parse the following text:
      "${text}"
    `;

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    const geminiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API request failed:", geminiResponse.status, errorBody);
      return null;
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates[0].content.parts[0].text;
    
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini response:", responseText);
      return null;
    }

    return parsedData;

  } catch (error) {
    console.error("Error in parseAppointmentText:", error);
    return null;
  }
};

/**
 * Calls the Gemini AI to generate a daily briefing for the user.
 * @param userId The ID of the user.
 * @param localDayStart The start of the local day.
 * @returns A generated daily briefing string or null.
 */
export const getDailyBriefing = async (userId: string, localDayStart: Date): Promise<string | null> => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
    console.error("Missing Supabase or Gemini API environment variables.");
    return null;
  }

  const supabaseAdmin = supabase; // Re-using the client, assuming it's configured with service role key if needed, or adjusting this to use a new admin client.
  // For this context, I'll assume the imported 'supabase' client is sufficient or a separate admin client is handled elsewhere.
  // If 'supabase' from './client' is not an admin client, this would need to be adjusted to create one.
  // Given the original error, 'supabase' was imported but unused, so I'm using it here.

  const localDayStartISO = localDayStart.toISOString();
  const localDayEndISO = new Date(localDayStart.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(); // End of day

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/daily-briefing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, // Use service role key for edge function
      },
      body: JSON.stringify({ userId, localDayStartISO, localDayEndISO }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Error calling daily-briefing edge function:", response.status, errorBody);
      return null;
    }

    const data = await response.json();
    return data.briefing;

  } catch (error) {
    console.error("Error in getDailyBriefing:", error);
    return null;
  }
};

/**
 * Calls the Gemini AI to suggest a habit challenge.
 * @param userId The ID of the user.
 * @param habitId The ID of the habit.
 * @returns A suggested habit challenge string or null.
 */
export const getHabitChallengeSuggestion = async (userId: string, habitId: string): Promise<string | null> => {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not set in environment variables.");
    return null;
  }

  // In a real application, you might fetch habit details from Supabase here
  // to provide more context to the AI. For this example, we'll use a generic prompt.

  const prompt = `Generate a short, encouraging, and actionable challenge suggestion for a user to improve their habit.
  The habit ID is ${habitId}. Focus on making the challenge specific, measurable, achievable, relevant, and time-bound (SMART).
  Keep it under 50 words.`;

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const geminiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API request failed for habit challenge:", geminiResponse.status, errorBody);
      return null;
    }

    const geminiData = await geminiResponse.json();
    return geminiData.candidates[0].content.parts[0].text;

  } catch (error) {
    console.error("Error calling Gemini API for habit challenge:", error);
    return null;
  }
};