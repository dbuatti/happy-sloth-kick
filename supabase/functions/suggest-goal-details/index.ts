import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, categories, currentDate } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: 'Missing text parameter' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not set' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Corrected model name

    const prompt = `
      You are an AI assistant that helps parse natural language into structured goal data.
      Given a user's goal description, extract the following information:
      - cleanedDescription: The main goal title, concise and clear.
      - description: A more detailed description if available, otherwise null.
      - category: The most relevant category from the provided list. If no category is suitable, suggest "General".
      - type: The goal type, one of 'daily', 'weekly', 'monthly', '3-month', '6-month', '9-month', 'yearly', '3-year', '5-year', '7-year', '10-year'. Infer from context if not explicit. Default to 'monthly' if no clear type.
      - dueDate: The due date in YYYY-MM-DD format. If no specific date, infer a reasonable one based on the goal type and current date (${currentDate}). If no date can be inferred, set to null.
      - notes: Any additional notes or context, otherwise null.
      - parentGoalId: If the goal implies it's a sub-goal of another, provide the parent goal's ID, otherwise null. (For now, always return null as we don't have parent context).

      Categories available: ${categories.map((c: { name: string }) => c.name).join(', ')}.

      Example 1: "Finish project report by next Friday, high priority, work related"
      Output:
      {
        "cleanedDescription": "Finish project report",
        "description": null,
        "category": "Work",
        "type": "weekly",
        "dueDate": "2024-07-26",
        "notes": null,
        "parentGoalId": null
      }

      Example 2: "Learn a new programming language, long term goal"
      Output:
      {
        "cleanedDescription": "Learn a new programming language",
        "description": null,
        "category": "Learning",
        "type": "yearly",
        "dueDate": "2025-07-19",
        "notes": null,
        "parentGoalId": null
      }

      Example 3: "Meditate daily for 10 minutes"
      Output:
      {
        "cleanedDescription": "Meditate for 10 minutes",
        "description": null,
        "category": "Health",
        "type": "daily",
        "dueDate": null,
        "notes": null,
        "parentGoalId": null
      }

      Example 4: "Read 'The Lord of the Rings' by end of year"
      Output:
      {
        "cleanedDescription": "Read 'The Lord of the Rings'",
        "description": null,
        "category": "Personal",
        "type": "yearly",
        "dueDate": "2024-12-31",
        "notes": null,
        "parentGoalId": null
      }

      Goal description: "${text}"
      Output:
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawContent = response.text();

    // Attempt to parse the JSON, handling potential markdown code blocks
    let parsedContent;
    try {
      parsedContent = JSON.parse(rawContent.replace(/```json\n|```/g, ''));
    } catch (jsonError) {
      console.error('Failed to parse AI response as JSON:', rawContent, jsonError);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify(parsedContent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in suggest_goal_details Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});