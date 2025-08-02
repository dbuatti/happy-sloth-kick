import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuggestTaskDetailsResponse {
  category: string;
  priority: string;
  dueDate: string | null; // ISO string
  remindAt: string | null; // ISO string
  section: string | null;
  cleanedDescription: string;
  link: string | null;
  notes: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, categories, currentDate } = await req.json();

    if (!description) {
      console.error("Error: Task description is required.");
      return new Response(JSON.stringify({ error: 'Task description is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("Error: GEMINI_API_KEY not set in environment variables.");
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not set in environment variables. Please configure it in your Supabase project settings.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const categoryNames = categories.map((cat: { name: string }) => cat.name).join(', ');

    const today = new Date(currentDate);
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });

    const prompt = `You are a helpful assistant that extracts structured task data from natural language descriptions.
    Today's date is ${currentDate} (${dayOfWeek}).
    
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
      "dueDate": "2024-08-15",
      "remindAt": "2024-08-15T18:00:00Z",
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
      "dueDate": "2024-08-16",
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
      "dueDate": "2024-08-23",
      "remindAt": null,
      "section": "Appointments",
      "cleanedDescription": "Schedule dentist appointment",
      "link": "https://dentist.com",
      "notes": "Remember to ask about the new insurance."
    }
    
    Your response MUST be a valid JSON object. Do NOT include any other text or markdown outside the JSON.
    Task Description: "${description}"`;

    console.log("Sending prompt to AI model...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("Raw AI response text:", text); // Log the raw response

    let parsedData;
    let jsonString = text.trim();

    try {
      // Attempt to parse directly first (if AI returns pure JSON)
      parsedData = JSON.parse(jsonString);
    } catch (directParseError) {
      console.log("Direct JSON parse failed, attempting markdown extraction...");
      // If direct parse fails, try to extract from markdown
      const jsonMatch = jsonString.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1].trim();
        try {
          parsedData = JSON.parse(jsonString);
          console.log("Successfully parsed JSON from markdown block.");
        } catch (markdownParseError) {
          console.error("Failed to parse JSON from markdown block:", markdownParseError);
          console.error("Problematic markdown JSON string:", jsonString);
          return new Response(JSON.stringify({ error: 'AI response contained JSON in markdown but it was invalid. Please try again or rephrase your input.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }
      } else {
        console.log("No markdown block found, attempting loose JSON extraction...");
        // If no markdown block, try to find the first JSON object
        const looseJsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (looseJsonMatch && looseJsonMatch[0]) {
          jsonString = looseJsonMatch[0].trim();
          try {
            parsedData = JSON.parse(jsonString);
            console.log("Successfully parsed loose JSON string.");
          } catch (looseParseError) {
            console.error("Failed to parse loose JSON string:", looseParseError);
            console.error("Problematic loose JSON string:", jsonString);
            return new Response(JSON.stringify({ error: 'AI response contained text that could not be parsed as JSON. Please try again or rephrase your input.' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            });
          }
        } else {
          // If all attempts fail
          console.error("AI response did not contain a recognizable JSON object:", text);
          return new Response(JSON.stringify({ error: 'AI response did not return a valid JSON object. Please try again or rephrase your input.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }
      }
    }

    // Ensure dates are correctly formatted or null
    const parseDateString = (dateStr: string | null) => {
      if (!dateStr) return null;
      try {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date.toISOString();
      } catch {
        return null;
      }
    };

    const finalDueDate = parsedData.dueDate ? parseDateString(parsedData.dueDate) : null;
    const finalRemindAt = parsedData.remindAt ? parseDateString(parsedData.remindAt) : null;

    // Map category name back to ID
    const matchedCategory = categories.find((cat: { name: string }) => cat.name.toLowerCase() === parsedData.category.toLowerCase());
    const finalCategory = matchedCategory ? matchedCategory.id : categories.find((cat: { name: string }) => cat.name.toLowerCase() === 'general')?.id || categories[0]?.id;

    const responseData = {
      category: finalCategory,
      priority: parsedData.priority || 'medium',
      dueDate: finalDueDate,
      remindAt: finalRemindAt,
      section: parsedData.section || null,
      cleanedDescription: parsedData.cleanedDescription || description,
      link: parsedData.link || null,
      notes: parsedData.notes || null, // Ensure notes is included
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) { // Catch any other errors during function execution
    console.error("Error in Edge Function (outer catch):", error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});