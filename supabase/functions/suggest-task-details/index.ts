/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />

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
    const { description, categories, currentDate } = await req.json();

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

    const today = new Date(currentDate);
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });

    const prompt = `Analyze the following task description and extract structured data in JSON format.
    
    Today's date is ${currentDate} (${dayOfWeek}).
    
    Extract:
    - 'category': The most relevant category from the provided list. If no clear category, default to 'General'.
    - 'priority': 'low', 'medium', 'high', or 'urgent'. Default to 'medium'.
    - 'dueDate': The due date in 'YYYY-MM-DD' format. If no specific date, leave null.
    - 'remindAt': The reminder date and time in 'YYYY-MM-DDTHH:MM:SSZ' (ISO 8601 UTC) format. If no specific reminder, leave null.
    - 'section': A suggested section name (e.g., 'Work', 'Personal', 'Groceries'). If no clear section, leave null.
    - 'cleanedDescription': The original description with extracted keywords removed.
    - 'link': A URL link if mentioned in the description (e.g., 'through the link', 'check this website'). If no link, leave null.

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
      "cleanedDescription": "Buy groceries for dinner",
      "link": null
    }

    Example 2:
    Description: "Finish report for work urgent due Friday, see details at https://example.com/report"
    Output:
    {
      "category": "Work",
      "priority": "urgent",
      "dueDate": "2024-08-16", // Assuming Friday is Aug 16, 2024
      "remindAt": null,
      "section": "Work",
      "cleanedDescription": "Finish report",
      "link": "https://example.com/report"
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
      "link": null
    }

    Example 4:
    Description: "Schedule dentist appointment next week, check this site: dentist.com"
    Output:
    {
      "category": "Personal",
      "priority": "medium",
      "dueDate": "2024-08-23", // Assuming next week is Aug 23, 2024
      "remindAt": null,
      "section": "Appointments",
      "cleanedDescription": "Schedule dentist appointment",
      "link": "https://dentist.com"
    }

    Task Description: "${description}"
    Output:
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("Raw AI response text:", text); // Log the raw response

    let jsonString = text.trim();
    // Attempt to extract JSON from potential markdown code blocks
    const jsonMatch = jsonString.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1].trim();
    } else {
      // Fallback for cases where it might just be the JSON without markdown fences
      // Or if the markdown fence is different (e.g., ```json without newline)
      // For now, if it doesn't match the specific ```json\n...\n```, we assume it's just the JSON.
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("Problematic JSON string:", jsonString);
      // If parsing fails, return a 500 with a more specific error message
      return new Response(JSON.stringify({ error: 'AI response could not be parsed as JSON. Please try again or rephrase your input.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
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
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error in Edge Function (outer catch):", error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});