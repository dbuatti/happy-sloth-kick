import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gdmjttmjjhadltaihpgr.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkbWp0dG1qamhhZGx0YWihpgrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTE5MjYsImV4cCI6MjA2OTA4NzkyNn0.5E7CR-pTkz1ri3sW4p289Gjzzm8BUtFNjZWwwvVmfYE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);