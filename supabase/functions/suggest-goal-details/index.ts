const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Calculates various future dates relative to a given current date.
 * @param currentDateString The current date in 'YYYY-MM-DD' format.
 * @returns An object containing tomorrow's date, next Friday's date, and next week's date in 'YYYY-MM-DD' format.
 */
function calculateFutureDates(currentDateString: string) {
  const today = new Date(currentDateString);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowDateString = tomorrow.toISOString().split('T')[0];

  const nextFriday = new Date(today);
  const currentDay = today.getDay(); // Sunday = 0, Friday = 5
  const daysUntilFriday = (5 - currentDay + 7) % 7;
  // If today is Friday, add 7 days to get next Friday, otherwise add daysUntilFriday
  nextFriday.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
  const nextFridayDateString = nextFriday.toISOString().split('T')[0];

  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const nextWeekDateString = nextWeek.toISOString().split('T')[0];

  const threeMonths = new Date(today);
  threeMonths.setMonth(today.getMonth() + 3);
  const threeMonthsDateString = threeMonths.toISOString().split('T')[0];

  const sixMonths = new Date(today);
  sixMonths.setMonth(today.getMonth() + 6);
  const sixMonthsDateString = sixMonths.toISOString().split('T')[0];

  const nineMonths = new Date(today);
  nineMonths.setMonth(today.getMonth() + 9);
  const nineMonthsDateString = nineMonths.toISOString().split('T')[0];

  const oneYear = new Date(today);
  oneYear.setFullYear(today.getFullYear() + 1);
  const oneYearDateString = oneYear.toISOString().split('T')[0];

  const threeYears = new Date(today);
  threeYears.setFullYear(today.getFullYear() + 3);
  const threeYearsDateString = threeYears.toISOString().split('T')[0];

  const fiveYears = new Date(today);
  fiveYears.setFullYear(today.getFullYear() + 5);
  const fiveYearsDateString = fiveYears.toISOString().split('T')[0];

  const sevenYears = new Date(today);
  sevenYears.setFullYear(today.getFullYear() + 7);
  const sevenYearsDateString = sevenYears.toISOString().split('T')[0];

  const tenYears = new Date(today);
  tenYears.setFullYear(today.getFullYear() + 10);
  const tenYearsDateString = tenYears.toISOString().split('T')[0];


  return { 
    tomorrowDateString, 
    nextFridayDateString, 
    nextWeekDateString,
    threeMonthsDateString,
    sixMonthsDateString,
    nineMonthsDateString,
    oneYearDateString,
    threeYearsDateString,
    fiveYearsDateString,
    sevenYearsDateString,
    tenYearsDateString,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, categories, currentDate } = await req.json();
    console.log("Suggest Goal Details: Received request:", { title, categories, currentDate });

    // Validate required input parameters
    if (!title) {
      return new Response(JSON.stringify({ error: 'Goal title is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Retrieve Gemini API key from environment variables
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("Suggest Goal Details: GEMINI_API_KEY not set.");
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not set in environment variables.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log("Suggest Goal Details: GEMINI_API_KEY loaded.");

    const categoryNames = categories.map((cat: { name: string }) => cat.name).join(', ');
    const today = new Date(currentDate);
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });

    // Calculate dynamic dates using the helper function
    const { 
      tomorrowDateString, 
      nextFridayDateString, 
      nextWeekDateString,
      threeMonthsDateString,
      sixMonthsDateString,
      nineMonthsDateString,
      oneYearDateString,
      threeYearsDateString,
      fiveYearsDateString,
      sevenYearsDateString,
      tenYearsDateString,
    } = calculateFutureDates(currentDate);

    // Construct the prompt for the Gemini AI
    const prompt = `You are a helpful assistant that extracts structured goal data from natural language descriptions.
    Today's date is ${currentDate} (${dayOfWeek}).
    
    Extract the following fields in JSON format:
    - 'category': The most relevant category from the provided list. If no clear category, default to 'General'.
    - 'dueDate': The due date in 'YYYY-MM-DD' format. If no specific date, leave null.
    - 'cleanedDescription': The original title with extracted keywords removed.
    - 'notes': Any additional notes or details that should be extracted, or null if none.

    Categories available: ${categoryNames}

    Example 1:
    Title: "Learn to play guitar by next year personal"
    Output:
    {
      "category": "Personal",
      "dueDate": "${oneYearDateString}",
      "cleanedDescription": "Learn to play guitar",
      "notes": null
    }

    Example 2:
    Title: "Finish writing book by end of month, remember to outline chapters"
    Output:
    {
      "category": "Creative",
      "dueDate": "${new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]}",
      "cleanedDescription": "Finish writing book",
      "notes": "Remember to outline chapters"
    }

    Example 3:
    Title: "Run a marathon"
    Output:
    {
      "category": "Health",
      "dueDate": null,
      "cleanedDescription": "Run a marathon",
      "notes": null
    }

    Example 4:
    Title: "Launch new product in 6 months"
    Output:
    {
      "category": "Work",
      "dueDate": "${sixMonthsDateString}",
      "cleanedDescription": "Launch new product",
      "notes": null
    }

    Example 5:
    Title: "Become financially independent in 10 years"
    Output:
    {
      "category": "Finance",
      "dueDate": "${tenYearsDateString}",
      "cleanedDescription": "Become financially independent",
      "notes": null
    }
    
    Your response MUST be a valid JSON object. Do NOT include any other text or markdown outside the JSON.
    Goal Title: "${title}"`;

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    // Call the Gemini API
    const geminiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    // Handle non-OK responses from Gemini API
    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Suggest Goal Details: Gemini API request failed:", geminiResponse.status, errorBody);
      throw new Error(`Gemini API request failed with status ${geminiResponse.status}: ${errorBody}`);
    }

    const geminiData = await geminiResponse.json();
    let responseText = geminiData.candidates[0].content.parts[0].text;
    
    // Clean the response text to ensure it's pure JSON by removing markdown code blocks
    responseText = responseText.replace(/```json\n|```/g, '').trim();

    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      console.error("Suggest Goal Details: Failed to parse Gemini response:", responseText);
      throw new Error("AI response was not valid JSON.");
    }

    /**
     * Parses a date string into an ISO 8601 string if valid, otherwise returns null.
     * @param dateStr The date string to parse.
     * @returns ISO 8601 string or null.
     */
    const parseDateString = (dateStr: string | null) => {
      if (!dateStr) return null;
      try {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date.toISOString();
      } catch {
        return null;
      }
    };

    // Process and format the extracted data
    const finalDueDate = parsedData.dueDate ? parseDateString(parsedData.dueDate) : null;

    // Find the matching category ID, defaulting to 'General' or the first available category
    const matchedCategory = categories.find((cat: { name: string }) => cat.name.toLowerCase() === parsedData.category.toLowerCase());
    const finalCategory = matchedCategory ? matchedCategory.id : categories.find((cat: { name: string }) => cat.name.toLowerCase() === 'general')?.id || categories[0]?.id;

    const responseData = {
      category: finalCategory,
      dueDate: finalDueDate,
      cleanedDescription: parsedData.cleanedDescription || title,
      notes: parsedData.notes || null,
    };

    // Return the structured response
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    // Catch and log any errors during the function execution
    console.error("Error in Edge Function 'suggest-goal-details' (outer catch):", error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

export {};