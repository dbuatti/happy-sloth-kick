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
    const { prompt, categories, currentDate } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not set' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const categoryNames = categories.map((c: { name: string }) => c.name).join(', ');

    const aiPrompt = `Given the following goal description and available categories, suggest a structured goal.
    Current Date: ${currentDate}
    Available Categories: ${categoryNames || 'None'}

    Goal Description: "${prompt}"

    Provide the response in JSON format with the following fields:
    {
      "cleanedDescription": "string", // A concise version of the goal title
      "description": "string | null", // A more detailed description if available, otherwise null
      "category": "string", // The most relevant category name from the available categories, or 'General' if no good match
      "type": "daily | weekly | monthly | 3-month | 6-month | 9-month | yearly | 3-year | 5-year | 7-year | 10-year", // Suggested goal type based on the description
      "dueDate": "YYYY-MM-DD | null", // Suggested due date if mentioned, otherwise null
      "parentGoalId": "string | null" // If this goal seems like a sub-goal of another, suggest a placeholder ID, otherwise null
    }
    
    If no specific due date is mentioned, leave 'dueDate' as null.
    If no specific category is mentioned, default to 'General'.
    If no detailed description is available, leave 'description' as null.
    If the goal is very short-term or ongoing, suggest 'daily' or 'weekly'. For longer-term, use appropriate 'X-month' or 'X-year' types.
    Ensure 'cleanedDescription' is always present.`;

    const result = await model.generateContent(aiPrompt);
    const response = await result.response;
    const text = response.text();

    // Attempt to parse the JSON, handle cases where AI might wrap it in markdown
    let parsedData;
    try {
      parsedData = JSON.parse(text.replace(/```json\n|\n```/g, ''));
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", text, parseError);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});