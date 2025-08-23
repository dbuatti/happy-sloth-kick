import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { GratitudeEntry, NewGratitudeEntryData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface GratitudeJournalProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const GratitudeJournal: React.FC<GratitudeJournalProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const queryClient = useQueryClient();

  const [newEntry, setNewEntry] = useState('');

  const { data: entries, isLoading, error } = useQuery<GratitudeEntry[], Error>({
    queryKey: ['gratitudeEntries', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('gratitude_journal_entries')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentUserId && !authLoading,
  });

  const addEntryMutation = useMutation<GratitudeEntry, Error, NewGratitudeEntryData, unknown>({
    mutationFn: async (entryData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('gratitude_journal_entries')
        .insert({ ...entryData, user_id: currentUserId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gratitudeEntries', currentUserId] });
      toast.success('Gratitude entry added!');
      setNewEntry('');
    },
  });

  if (isLoading) return <Card><CardContent><p>Loading gratitude entries...</p></CardContent></Card>;
  if (error) return <Card><CardContent><p>Error: {error.message}</p></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Gratitude Journal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Textarea
            placeholder="What are you grateful for today?"
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            rows={3}
          />
          <Button onClick={() => addEntryMutation.mutate({ entry: newEntry })} disabled={!newEntry.trim()}>
            Add Entry
          </Button>
        </div>
        <div className="mt-6 space-y-3">
          {entries?.map((entry) => (
            <div key={entry.id} className="border-b pb-3 last:border-b-0">
              <p className="text-sm text-muted-foreground">{format(new Date(entry.created_at), 'PPP')}</p>
              <p className="text-base">{entry.entry}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default GratitudeJournal;