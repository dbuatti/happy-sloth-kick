import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0";
import { format, parseISO, addDays } from 'https://esm.sh/date-fns@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, existingCategories, currentDate } = await req.json();

    if (!title || !existingCategories || !currentDate) {
      return new Response(JSON.stringify({ error: 'Missing required fields: title, existingCategories, currentDate' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    console.log('GEMINI_API_KEY status:', geminiApiKey ? 'set' : 'NOT SET');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not set in Supabase secrets. Please configure it in your Supabase dashboard under Edge Functions -> Manage Secrets.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const categoryNames = existingCategories.map((c: { name: string }) => c.name);
    const formattedCategories = categoryNames.length > 0 ? `(Choose from: ${categoryNames.join(', ')})` : '';

    const prompt = `
      Analyze the following goal title and extract relevant details.
      Provide the output in a JSON format with the following keys:
      - cleanedDescription: The main goal title, cleaned of any date, time, priority, or category keywords.
      - category: The most relevant category from the provided list. If no strong match, default to 'General' or 'Personal'.
      - priority: 'low', 'medium', 'high', or 'urgent'. Default to 'medium'.
      - dueDate: The due date in YYYY-MM-DD format, or null if not specified. Assume dates relative to ${currentDate}.
      - notes: Any additional notes or context from the description, or null.
      - remindAt: The reminder date and time in ISO 8601 format (e.g., 2023-10-27T10:00:00Z), or null. Assume times relative to ${currentDate}.
      - section: A suggested section name, or null.
      - link: A URL or local file path, or null.

      Existing Categories: ${formattedCategories}

      Examples for category matching:
      - "Go to the shops" -> "Personal" or "Errands"
      - "Prepare Q3 report" -> "Career"
      - "Practice guitar scales" -> "Music"

      Goal Title: "${title}"

      Ensure the output is ONLY the JSON object.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Attempt to parse the JSON, handling potential markdown code blocks
    let jsonString = text.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.substring(7, jsonString.lastIndexOf('```')).trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response as JSON. This might indicate an issue with the AI model\'s output format or an invalid API key. Please check the raw response.', rawResponse: text }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Map category name back to ID
    const suggestedCategoryName = parsed.category;
    const categoryObject = existingCategories.find((c: { name: string }) => c.name.toLowerCase() === suggestedCategoryName.toLowerCase());
    parsed.category = categoryObject ? categoryObject.name : 'General'; // Return name, client will map to ID

    // Basic date parsing for relative dates
    if (parsed.dueDate && typeof parsed.dueDate === 'string') {
      const lowerCaseDueDate = parsed.dueDate.toLowerCase();
      if (lowerCaseDueDate.includes('tomorrow')) {
        parsed.dueDate = format(addDays(parseISO(currentDate), 1), 'yyyy-MM-dd');
      } else if (lowerCaseDueDate.includes('next week')) {
        parsed.dueDate = format(addDays(parseISO(currentDate), 7), 'yyyy-MM-dd');
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in suggest_goal_details Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});