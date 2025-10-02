"use client";

import { useState, useEffect } from 'react';
// Removed: import { useAuth } from '@/context/AuthContext';
// Removed: import { supabase } from '@/integrations/supabase/client';

export interface GratitudeEntry {
  id: string;
  user_id: string;
  entry: string;
  created_at: string;
}

export interface WorryEntry {
  id: string;
  user_id: string;
  thought: string;
  created_at: string;
}

interface UseJournalEntriesProps {
  userId?: string;
}

export const useJournalEntries = ({ userId }: UseJournalEntriesProps) => {
  const [gratitudeEntries, setGratitudeEntries] = useState<GratitudeEntry[]>([]);
  const [worryEntries, setWorryEntries] = useState<WorryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchJournalEntries = async () => {
      setLoading(true);
      setError(null);
      // Dummy data for now
      setGratitudeEntries([]);
      setWorryEntries([]);
      setLoading(false);
    };

    fetchJournalEntries();
  }, [userId]);

  return { gratitudeEntries, worryEntries, loading, error };
};