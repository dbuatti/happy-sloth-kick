import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { GratitudeEntry, NewGratitudeEntryData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const GratitudeJournal: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const [newEntry, setNewEntry] = useState('');

  const { data: entries, isLoading, error } = useQuery<GratitudeEntry[], Error>({
    queryKey: ['gratitudeEntries', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('gratitude_journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !authLoading,
  });

  const addEntryMutation = useMutation<GratitudeEntry, Error, NewGratitudeEntryData, unknown>({
    mutationFn: async (newEntryData) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('gratitude_journal_entries')
        .insert({ ...newEntryData, user_id: userId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gratitudeEntries', userId] });
      toast.success('Gratitude entry added!');
      setNewEntry('');
    },
    onError: (err) => {
      toast.error(`Failed to add entry: ${err.message}`);
    },
  });

  const deleteEntryMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('gratitude_journal_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gratitudeEntries', userId] });
      toast.success('Gratitude entry deleted!');
    },
    onError: (err) => {
      toast.error(`Failed to delete entry: ${err.message}`);
    },
  });

  const handleAddEntry = () => {
    if (newEntry.trim()) {
      addEntryMutation.mutate({ entry: newEntry.trim() });
    }
  };

  if (isLoading || authLoading) {
    return <Card><CardContent>Loading entries...</CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="text-red-500">Error: {error.message}</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gratitude Journal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Textarea
              placeholder="What are you grateful for today?"
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              rows={3}
            />
            <Button onClick={handleAddEntry} disabled={addEntryMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Add Entry
            </Button>
          </div>
          {entries?.length === 0 ? (
            <p className="text-center text-gray-500">No entries recorded yet. Start with something small!</p>
          ) : (
            <div className="space-y-3">
              {entries?.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                  <div>
                    <p className="text-sm">{entry.entry}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {format(parseISO(entry.created_at), 'PPP p')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteEntryMutation.mutate(entry.id)}
                    disabled={deleteEntryMutation.isPending}
                    className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GratitudeJournal;