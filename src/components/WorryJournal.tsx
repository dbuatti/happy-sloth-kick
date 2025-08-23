import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { WorryEntry, NewWorryEntryData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface WorryJournalProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const WorryJournal: React.FC<WorryJournalProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const queryClient = useQueryClient();

  const [newThought, setNewThought] = useState('');

  const { data: entries, isLoading, error } = useQuery<WorryEntry[], Error>({
    queryKey: ['worryEntries', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('worry_journal_entries')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentUserId && !authLoading,
  });

  const addEntryMutation = useMutation<WorryEntry, Error, NewWorryEntryData, unknown>({
    mutationFn: async (entryData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('worry_journal_entries')
        .insert({ ...entryData, user_id: currentUserId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worryEntries', currentUserId] });
      toast.success('Worry entry added!');
      setNewThought('');
    },
  });

  if (isLoading) return <Card><CardContent><p>Loading worry entries...</p></CardContent></Card>;
  if (error) return <Card><CardContent><p>Error: {error.message}</p></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Worry Journal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Textarea
            placeholder="What's on your mind?"
            value={newThought}
            onChange={(e) => setNewThought(e.target.value)}
            rows={3}
          />
          <Button onClick={() => addEntryMutation.mutate({ thought: newThought })} disabled={!newThought.trim()}>
            Add Thought
          </Button>
        </div>
        <div className="mt-6 space-y-3">
          {entries?.map((entry) => (
            <div key={entry.id} className="border-b pb-3 last:border-b-0">
              <p className="text-sm text-muted-foreground">{format(new Date(entry.created_at), 'PPP')}</p>
              <p className="text-base">{entry.thought}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorryJournal;