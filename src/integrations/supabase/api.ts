import { supabase } from './supabaseClient'; // Ensure correct import path
import { format, startOfDay, endOfDay } from 'date-fns'; // Import format, startOfDay, endOfDay for date handling

// Define interfaces for AI suggestions
interface AISuggestionCategory {
  id: string;
  name: string;
}

interface AISuggestionResponse {
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null; // YYYY-MM-DD
  remindAt: string | null; // ISO 8601 UTC
  section: string | null;
  cleanedDescription: string;
  link: string | null;
  notes: string | null;
}

/**
 * Calculates various future dates relative to a given current date.
 * @param currentDateString The current date in 'YYYY-MM-DD' format.
 * @returns An object containing tomorrow's date, next Friday's date, and next week's date in 'YYYY-MM-DD' format.
 */
function calculateFutureDates(currentDateString: string) {
  const today = new Date(currentDateString);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowDateString = format(tomorrow, 'yyyy-MM-dd');

  const nextFriday = new Date(today);
  const currentDay = today.getDay(); // Sunday = 0, Friday = 5
  const daysUntilFriday = (5 - currentDay + 7) % 7;
  // If today is Friday, add 7 days to get next Friday, otherwise add daysUntilFriday
  nextFriday.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
  const nextFridayDateString = format(nextFriday, 'yyyy-MM-dd');

  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const nextWeekDateString = format(nextWeek, 'yyyy-MM-dd');

  return { tomorrowDateString, nextFridayDateString, nextWeekDateString };
}

export async function parseAppointmentText(text: string, contextDate: Date): Promise<any | null> {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not set.");
    return null;
  }

  const todayDateString = format(contextDate, 'yyyy-MM-dd');
  const tomorrow = new Date(contextDate);
  tomorrow.setDate(contextDate.getDate() + 1);
  const tomorrowDateString = format(tomorrow, 'yyyy-MM-dd');

  const prompt = `
    You are an expert appointment parser. Your task is to extract appointment details from a given text and return them as a JSON object.
    The current date is ${todayDateString}. Use this for context if the text mentions relative dates like "today" or "tomorrow".

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
      "date": "${todayDateString}",
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
      throw new Error(`Gemini API request failed with status ${geminiResponse.status}: ${errorBody}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates[0].content.parts[0].text;
    
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini response:", responseText);
      throw new Error("AI response was not valid JSON.");
    }
    return parsedData;
  } catch (error) {
    console.error("Error in parseAppointmentText:", error);
    return null;
  }
}

export async function suggestTaskDetails(
  description: string,
  categories: AISuggestionCategory[],
  currentDate: Date
): Promise<AISuggestionResponse | null> {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not set.");
    return null;
  }

  const categoryNames = categories.map(cat => cat.name).join(', ');
  const todayDateString = format(currentDate, 'yyyy-MM-dd');
  const dayOfWeek = format(currentDate, 'EEEE');

  const { tomorrowDateString, nextFridayDateString, nextWeekDateString } = calculateFutureDates(todayDateString);

  const prompt = `You are a helpful assistant that extracts structured task data from natural language descriptions.
    Today's date is ${todayDateString} (${dayOfWeek}).
    
    Extract the following fields in JSON format:
    - 'category': The most relevant category from the provided list. If no clear category, default to 'General'.
    - 'priority': 'low', 'medium', 'high', or 'urgent'. Default to 'medium'.
    - 'dueDate': The due date in 'YYYY-MM-DD' format. If no specific date, leave null.
    - 'remindAt': The reminder date and time in 'YYYY-MM-DDTHH:MM:SSZ' (ISO 8601 UTC) format. If no specific reminder, leave null.
    - 'section': A suggested section name (e.g., 'Work', 'Personal', 'Groceries'). If no clear section, leave null.
    - 'cleanedDescription': The original description with extracted keywords removed.
    - 'link': A URL link if mentioned in the description (e.g., 'through the link', 'check this website'). If no link, leave null.
    - 'notes': Any additional notes or details that should be extracted, or null if none.

    Categories available: ${categoryNames}

    Example 1:
    Description: "Buy groceries for dinner by tomorrow high priority at 6pm personal"
    Output:
    {
      "category": "Personal",
      "priority": "high",
      "dueDate": "${tomorrowDateString}",
      "remindAt": "${tomorrowDateString}T18:00:00Z",
      "section": "Groceries",
      "cleanedDescription": "Buy groceries for dinner",
      "link": null,
      "notes": null
    }

    Example 2:
    Description: "Finish report for work urgent due Friday, see details at https://example.com/report"
    Output:
    {
      "category": "Work",
      "priority": "urgent",
      "dueDate": "${nextFridayDateString}",
      "remindAt": null,
      "section": "Work",
      "cleanedDescription": "Finish report",
      "link": "https://example.com/report",
      "notes": null
    }

    Example 3:
    Description: "Call mom"
    Output:
    {
      "category": "General",
      "priority": "medium",
      "dueDate": null,
      "remindAt": null,
      "section": null,
      "cleanedDescription": "Call mom",
      "link": null,
      "notes": null
    }

    Example 4:
    Description: "Schedule dentist appointment next week, check this site: dentist.com. Remember to ask about the new insurance."
    Output:
    {
      "category": "Personal",
      "priority": "medium",
      "dueDate": "${nextWeekDateString}",
      "remindAt": null,
      "section": "Appointments",
      "cleanedDescription": "Schedule dentist appointment",
      "link": "https://dentist.com",
      "notes": "Remember to ask about the new insurance."
    }
    
    Your response MUST be a valid JSON object. Do NOT include any other text or markdown outside the JSON.
    Task Description: "${description}"`;

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
      throw new Error(`Gemini API request failed with status ${geminiResponse.status}: ${errorBody}`);
    }

    const geminiData = await geminiResponse.json();
    let responseText = geminiData.candidates[0].content.parts[0].text;
    
    // Clean the response text to ensure it's pure JSON by removing markdown code blocks
    responseText = responseText.replace(/```json\n|```/g, '').trim();

    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini response:", responseText);
      throw new Error("AI response was not valid JSON.");
    }

    return parsedData;
  } catch (error) {
    console.error("Error in suggestTaskDetails:", error);
    return null;
  }
}

export async function getDailyBriefing(userId: string, currentDate: Date): Promise<string | null> {
  const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!SUPABASE_PROJECT_ID) {
    console.error("VITE_SUPABASE_PROJECT_ID not set.");
    return null;
  }

  const localDayStartISO = startOfDay(currentDate).toISOString();
  const localDayEndISO = endOfDay(currentDate).toISOString();

  const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/daily-briefing`;

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabase.auth.session()?.access_token || ''}`, // Include auth token if available
      },
      body: JSON.stringify({ userId, localDayStartISO, localDayEndISO }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Daily Briefing Edge Function failed:", response.status, errorBody);
      throw new Error(`Daily Briefing Edge Function failed with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    return data.briefing || null;
  } catch (error) {
    console.error("Error fetching daily briefing:", error);
    return null;
  }
}