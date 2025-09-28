import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

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
    const { partialDescription } = await req.json();

    if (!partialDescription) {
      return new Response(JSON.stringify({ error: 'Missing partialDescription in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not set in environment variables.');
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Given the following partial task description, generate 3 concise and distinct suggestions for completing or expanding the task. Each suggestion should be a short phrase or sentence. Format the output as a JSON array of strings.

Partial description: "${partialDescription}"

Example output:
["Research market trends", "Draft initial report", "Schedule team meeting"]

Suggestions:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Attempt to parse the text as JSON, handle cases where AI might not return perfect JSON
    let suggestions;
    try {
      suggestions = JSON.parse(text);
      if (!Array.isArray(suggestions) || !suggestions.every(s => typeof s === 'string')) {
        throw new Error('AI response is not a valid JSON array of strings.');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON, attempting fallback:', text);
      // Fallback: if JSON parsing fails, try to extract suggestions heuristically
      suggestions = text.split('\n')
                        .map(line => line.replace(/^-?\s*["']?/, '').replace(/["']?$/, '').trim())
                        .filter(line => line.length > 0 && !line.toLowerCase().includes('suggestions:'));
      // Limit to 3 suggestions if fallback is used
      suggestions = suggestions.slice(0, 3);
    }

    return new Response(JSON.stringify({ suggestions }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});