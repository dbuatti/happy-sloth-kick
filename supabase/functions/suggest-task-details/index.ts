import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, categories } = await req.json();

    if (!description) {
      return new Response(JSON.stringify({ error: 'Task description is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not set in environment variables.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const categoryNames = categories.map((cat: { name: string }) => cat.name).join(', ');

    const prompt = `Analyze the following task description and extract structured data in JSON format.
    
    Extract:
    - 'category': The most relevant category from the provided list. If no clear category, default to 'General'.
    - 'priority': 'low', 'medium', 'high', or 'urgent'. Default to 'medium'.
    - 'dueDate': The due date in 'YYYY-MM-DD' format. If no specific date, leave null.
    - 'remindAt': The reminder date and time in 'YYYY-MM-DDTHH:MM:SSZ' (ISO 8601 UTC) format. If no specific reminder, leave null.
    - 'section': A suggested section name (e.g., 'Work', 'Personal', 'Groceries'). If no clear section, leave null.
    - 'cleanedDescription': The original description with extracted keywords removed.

    Categories available: ${categoryNames}

    Example 1:
    Description: "Buy groceries for dinner by tomorrow high priority at 6pm personal"
    Output:
    {
      "category": "Personal",
      "priority": "high",
      "dueDate": "2024-08-15", // Assuming tomorrow is Aug 15, 2024
      "remindAt": "2024-08-15T18:00:00Z",
      "section": "Groceries",
      "cleanedDescription": "Buy groceries for dinner"
    }

    Example 2:
    Description: "Finish report for work urgent due Friday"
    Output:
    {
      "category": "Work",
      "priority": "urgent",
      "dueDate": "2024-08-16", // Assuming Friday is Aug 16, 2024
      "remindAt": null,
      "section": "Work",
      "cleanedDescription": "Finish report"
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
      "cleanedDescription": "Call mom"
    }

    Example 4:
    Description: "Schedule dentist appointment next week"
    Output:
    {
      "category": "Personal",
      "priority": "medium",
      "dueDate": "2024-08-23", // Assuming next week is Aug 23, 2024
      "remindAt": null,
      "section": "Appointments",
      "cleanedDescription": "Schedule dentist appointment"
    }

    Task Description: "${description}"
    Output:
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Attempt to parse the JSON, handling potential markdown code blocks
    let jsonString = text.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.substring(7, jsonString.lastIndexOf('```')).trim();
    }

    const parsedData = JSON.parse(jsonString);

    // Ensure dates are correctly formatted or null
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

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
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error in Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});