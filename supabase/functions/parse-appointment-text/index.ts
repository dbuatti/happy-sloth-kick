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
    const { text, currentDate } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not set.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
      You are an expert appointment parser. Your task is to extract appointment details from a given text and return them as a JSON object.
      The current date is ${currentDate}. Use this for context if the text mentions relative dates like "today" or "tomorrow".

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
        "date": "${currentDate}",
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
        "date": "2024-08-08",
        "startTime": "13:00",
        "endTime": "14:00"
      }

      Now, parse the following text:
      "${text}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini response:", responseText);
      throw new Error("AI response was not valid JSON.");
    }

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error in Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});