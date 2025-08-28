"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/lib/types"; // Import the Database type

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);