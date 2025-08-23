import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { WorryEntry, NewWorryEntryData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';

interface WorryJournalProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const WorryJournal: React.FC<WorryJournalProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
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
      return data as WorryEntry[];
    },
    enabled: !!currentUserId,
  });

  const addEntryMutation = useMutation<WorryEntry, Error, NewWorryEntryData, unknown>({
    mutationFn: async (entryData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('worry_journal_entries')
        .insert({ ...entryData, user_id: currentUserId })
        .select()
        .single();

      if (error) throw error;
      return data as WorryEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worryEntries', currentUserId] });
      toast.success('Worry entry added!');
      setNewThought('');
    },
  });

  const deleteEntryMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('worry_journal_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worryEntries', currentUserId] });
      toast.success('Worry entry deleted!');
    },
  });

  const handleAddEntry = async () => {
    if (!newThought.trim()) {
      toast.error('Thought cannot be empty.');
      return;
    }
    await addEntryMutation.mutateAsync({ thought: newThought });
  };

  const handleDeleteEntry = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      await deleteEntryMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Worry Journal</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading entries...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Worry Journal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading entries: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Worry Journal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Textarea
              placeholder="What's on your mind? Write down your worries to process them."
              value={newThought}
              onChange={(e) => setNewThought(e.target.value)}
              className="min-h-[80px]"
            />
            <Button onClick={handleAddEntry} className="mt-2 w-full">
              <Plus className="mr-2 h-4 w-4" /> Add Thought
            </Button>
          </div>
          <div className="space-y-2">
            {entries.length === 0 ? (
              <p className="text-muted-foreground">No entries yet. Write down a worry to get started.</p>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="flex justify-between items-start p-3 border rounded-md">
                  <div>
                    <p className="text-sm">{entry.thought}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-500 h-6 w-6" onClick={() => handleDeleteEntry(entry.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorryJournal;