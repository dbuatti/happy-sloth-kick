// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0";
// Removed: import { corsHeaders } from "../_shared/cors.ts";

const corsHeaders = { // Defined directly
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => { // Explicitly type req as Request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Incoming request headers:", req.headers);
    const rawBody = await req.text();
    console.log("Raw request body:", rawBody);

    if (!rawBody) {
      console.error("Error: Request body is empty.");
      return new Response(JSON.stringify({ error: 'Request body is empty.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    let requestBody;
    try {
      requestBody = JSON.parse(rawBody);
    } catch (parseError: any) {
      console.error("Error parsing request body as JSON:", parseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { prompt, categories, currentDate } = requestBody;
    console.log("Received request body (parsed):", requestBody);

    if (!prompt) {
      console.error("Error: Prompt is required");
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error("Error: GEMINI_API_KEY not set in environment variables.");
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not set' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log("GEMINI_API_KEY successfully retrieved.");

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Changed model to 'gemini-1.5-flash'

    const categoryNames = categories.map((c: { name: string }) => c.name).join(', ');

    const aiPrompt = `Given the following goal description and available categories, suggest a structured goal.
    Current Date: ${currentDate}
    Available Categories: ${categoryNames || 'None'}

    Goal Description: "${prompt}"

    Provide the response in JSON format with the following fields:
    {
      "cleanedDescription": "string",
      "description": "string | null",
      "category": "string",
      "type": "daily | weekly | monthly | 3-month | 6-month | 9-month | yearly | 3-year | 5-year | 7-year | 10-year",
      "dueDate": "YYYY-MM-DD | null",
      "parentGoalId": "string | null"
    }
    
    If no specific due date is mentioned, leave 'dueDate' as null.
    If no specific category is mentioned, default to 'General'.
    If no detailed description is available, leave 'description' as null.
    If the goal is very short-term or ongoing, suggest 'daily' or 'weekly'. For longer-term, use appropriate 'X-month' or 'X-year' types.
    Ensure 'cleanedDescription' is always present.`;

    console.log("Sending AI prompt:", aiPrompt);

    const result = await model.generateContent(aiPrompt);
    const response = await result.response;
    const text = response.text();
    console.log("Raw AI response:", text);

    let parsedData;
    try {
      parsedData = JSON.parse(text.replace(/```json\n|\n```/g, ''));
      console.log("Parsed AI data:", parsedData);
    } catch (parseError: any) {
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
  } catch (error: any) {
    console.error('Error processing request in Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});