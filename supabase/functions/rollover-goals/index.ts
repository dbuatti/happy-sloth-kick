import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  format,
  parseISO,
  startOfDay,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  endOfWeek,
  lastDayOfMonth,
  nextFriday,
} from 'https://esm.sh/date-fns@2.30.0'; // Using a specific version for stability

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = startOfDay(new Date()); // Start of today in local time

    // Fetch uncompleted goals with a due_date in the past
    const { data: overdueGoals, error } = await supabaseClient
      .from('goals')
      .select('id, type, due_date, completed')
      .eq('completed', false)
      .lt('due_date', format(today, 'yyyy-MM-dd')); // Filter for dates strictly before today

    if (error) {
      console.error('Error fetching overdue goals:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!overdueGoals || overdueGoals.length === 0) {
      return new Response(JSON.stringify({ message: 'No overdue goals to roll over.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const updates = overdueGoals.map(goal => {
      const currentDueDate = parseISO(goal.due_date);
      let newDueDate: Date;

      switch (goal.type) {
        case 'daily':
          newDueDate = today;
          break;
        case 'weekly':
          newDueDate = nextFriday(today, { weekStartsOn: 1 }); // Next Friday from today, assuming week starts Monday
          break;
        case 'monthly':
          newDueDate = lastDayOfMonth(addMonths(today, 1)); // Last day of next month from today
          break;
        case '3-month':
          newDueDate = lastDayOfMonth(addMonths(currentDueDate, 3));
          break;
        case '6-month':
          newDueDate = lastDayOfMonth(addMonths(currentDueDate, 6));
          break;
        case '9-month':
          newDueDate = lastDayOfMonth(addMonths(currentDueDate, 9));
          break;
        case 'yearly':
          newDueDate = lastDayOfMonth(addYears(currentDueDate, 1));
          break;
        case '3-year':
          newDueDate = lastDayOfMonth(addYears(currentDueDate, 3));
          break;
        case '5-year':
          newDueDate = lastDayOfMonth(addYears(currentDueDate, 5));
          break;
        case '7-year':
          newDueDate = lastDayOfMonth(addYears(currentDueDate, 7));
          break;
        case '10-year':
          newDueDate = lastDayOfMonth(addYears(currentDueDate, 10));
          break;
        default:
          console.warn(`Unknown goal type for rollover: ${goal.type}. Goal ID: ${goal.id}`);
          return null; // Skip this goal
      }

      return {
        id: goal.id,
        due_date: format(newDueDate, 'yyyy-MM-dd'),
        updated_at: new Date().toISOString(), // Update timestamp
      };
    }).filter(Boolean); // Filter out nulls from skipped goals

    if (updates.length === 0) {
      return new Response(JSON.stringify({ message: 'No goals were eligible for rollover after processing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { error: updateError } = await supabaseClient
      .from('goals')
      .upsert(updates, { onConflict: 'id' }); // Use upsert to update multiple rows by ID

    if (updateError) {
      console.error('Error updating goals:', updateError.message);
      return new Response(JSON.stringify({ error: updateError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: `Successfully rolled over ${updates.length} goals.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (generalError: any) {
    console.error('General error in rollover-goals function:', generalError.message);
    return new Response(JSON.stringify({ error: generalError.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});