"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/lib/types";

export const supabase = createBrowserClient<Database>(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);