// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => { // Explicitly type req as Request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, categories, currentDate } = await req.json();

    if (!description || !categories || !currentDate) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: description, categories, or currentDate' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not set in environment variables' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Changed model to 'gemini-pro'

    const categoryNames = categories.map((c: { name: string }) => c.name).join(', ');

    const prompt = `You are an AI assistant that helps organize tasks.
Given a task description, a list of available categories, and the current date,
suggest a cleaned description, a category, priority, due date, notes, reminder time, section, and a relevant link.
The output must be a JSON object matching the following TypeScript interface:

interface AISuggestionResult {
  cleanedDescription: string;
  category: string; // The name of the suggested category from the provided list
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null; // YYYY-MM-DD format, or null if no specific date
  notes: string | null;
  remindAt: string | null; // ISO string format (e.g., "2023-10-27T10:00:00Z"), or null
  section: string | null; // The name of the suggested section, or null
  link: string | null; // A relevant URL, or null
}

Available Categories: [${categoryNames}]
Current Date: ${currentDate}

Example 1:
Description: "Buy groceries for dinner tomorrow high priority"
Categories: ["Personal", "Work", "Health"]
Current Date: 2023-10-26
Output:
{
  "cleanedDescription": "Buy groceries for dinner",
  "category": "Personal",
  "priority": "high",
  "dueDate": "2023-10-27",
  "notes": null,
  "remindAt": null,
  "section": null,
  "link": null
}

Example 2:
Description: "Finish report by EOD urgent work"
Categories: ["Personal", "Work", "Health"]
Current Date: 2023-10-26
Output:
{
  "cleanedDescription": "Finish report",
  "category": "Work",
  "priority": "urgent",
  "dueDate": "2023-10-26",
  "notes": null,
  "remindAt": null,
  "section": null,
  "link": null
}

Example 3:
Description: "Call John about project status next Tuesday at 10 AM"
Categories: ["Personal", "Work", "Health"]
Current Date: 2023-10-26
Output:
{
  "cleanedDescription": "Call John about project status",
  "category": "Work",
  "priority": "medium",
  "dueDate": "2023-10-31",
  "remindAt": "2023-10-31T10:00:00Z",
  "notes": null,
  "section": null,
  "link": null
}

Now, process the following:
Description: "${description}"
Categories: [${categoryNames}]
Current Date: ${currentDate}
Output:
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Attempt to parse the JSON string from the AI response
    let aiSuggestion: any;
    try {
      aiSuggestion = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', text, parseError);
      return new Response(JSON.stringify({ error: 'AI response was not valid JSON', rawResponse: text }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(aiSuggestion), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) { // Type assert error to Error
    console.error('Error in Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});