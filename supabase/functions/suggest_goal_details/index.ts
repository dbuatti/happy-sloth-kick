import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized: Missing Authorization header', {
        status: 401,
        headers: corsHeaders,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response('Unauthorized: Invalid or expired token', {
        status: 401,
        headers: corsHeaders,
      });
    }

    let requestBody;
    try {
      const bodyText = await req.text(); // Read as text
      if (!bodyText) {
        return new Response(JSON.stringify({ error: 'Request body is empty.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      requestBody = JSON.parse(bodyText); // Manually parse
    } catch (jsonParseError) {
      console.error('Failed to parse request body as JSON:', jsonParseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = requestBody?.prompt;
    const categories = requestBody?.categories;
    const currentDate = requestBody?.currentDate;

    if (!prompt) {
      return new Response('Missing prompt in request body', {
        status: 400,
        headers: corsHeaders,
      });
    }
    if (!categories || !Array.isArray(categories)) {
      return new Response('Missing or invalid categories in request body', {
        status: 400,
        headers: corsHeaders,
      });
    }
    if (!currentDate) {
      return new Response('Missing currentDate in request body', {
        status: 400,
        headers: corsHeaders,
      });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response('Missing GEMINI_API_KEY environment variable', {
        status: 500,
        headers: corsHeaders,
      });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const categoryNames = categories.map((c: { name: string }) => c.name).join(', ');

    const aiPrompt = `You are an AI assistant that helps users quickly create goals.
Given a user's natural language input, extract the following information:
- cleanedDescription: The main title of the goal, concise.
- description: A more detailed description if available, otherwise null.
- category: The most relevant category from the provided list. If no category is suitable, suggest 'General'.
- dueDate: The due date in YYYY-MM-DD format. If no specific date is mentioned, infer a reasonable future date (e.g., end of month, end of quarter, end of year) based on the goal's scope, or null if it's an ongoing goal.
- notes: Any additional notes or context, otherwise null.

Current Date: ${currentDate}
Available Categories: ${categoryNames}

User Input: "${prompt}"

Respond with a JSON object only, like this:
{
  "cleanedDescription": "Extracted goal title",
  "description": "Detailed description or null",
  "category": "Suggested Category Name",
  "dueDate": "YYYY-MM-DD or null",
  "notes": "Additional notes or null"
}`;

    const result = await model.generateContent(aiPrompt);
    const response = await result.response;
    const text = response.text();

    // Attempt to parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch (jsonError) {
      console.error('Failed to parse AI response as JSON:', text, jsonError);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate and sanitize the category
    const suggestedCategoryName = parsedResponse.category;
    const existingCategory = categories.find((c: { name: string }) => c.name.toLowerCase() === suggestedCategoryName.toLowerCase());
    if (!existingCategory) {
      // If the suggested category doesn't exist, default to 'General' or the first available category
      const generalCategory = categories.find((c: { name: string }) => c.name.toLowerCase() === 'general');
      parsedResponse.category = generalCategory ? generalCategory.name : categories[0]?.name || 'General';
    } else {
      parsedResponse.category = existingCategory.name; // Use the exact name from the list
    }

    return new Response(JSON.stringify(parsedResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in suggest_goal_details function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});