import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { WorryEntry, NewWorryEntryData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const WorryJournal: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const [newWorry, setNewWorry] = useState('');

  const { data: worries, isLoading, error } = useQuery<WorryEntry[], Error>({
    queryKey: ['worryEntries', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('worry_journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !authLoading,
  });

  const addWorryMutation = useMutation<WorryEntry, Error, NewWorryEntryData, unknown>({
    mutationFn: async (newWorryData) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('worry_journal_entries')
        .insert({ ...newWorryData, user_id: userId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worryEntries', userId] });
      toast.success('Worry added!');
      setNewWorry('');
    },
    onError: (err) => {
      toast.error(`Failed to add worry: ${err.message}`);
    },
  });

  const deleteWorryMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('worry_journal_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worryEntries', userId] });
      toast.success('Worry deleted!');
    },
    onError: (err) => {
      toast.error(`Failed to delete worry: ${err.message}`);
    },
  });

  const handleAddWorry = () => {
    if (newWorry.trim()) {
      addWorryMutation.mutate({ thought: newWorry.trim() });
    }
  };

  if (isLoading || authLoading) {
    return <Card><CardContent>Loading worries...</CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="text-red-500">Error: {error.message}</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Worry Journal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Textarea
              placeholder="Write down your worries here..."
              value={newWorry}
              onChange={(e) => setNewWorry(e.target.value)}
              rows={3}
            />
            <Button onClick={handleAddWorry} disabled={addWorryMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Add Worry
            </Button>
          </div>
          {worries?.length === 0 ? (
            <p className="text-center text-gray-500">No worries recorded yet. Take a moment to reflect.</p>
          ) : (
            <div className="space-y-3">
              {worries?.map((worry) => (
                <div key={worry.id} className="flex items-start justify-between p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                  <div>
                    <p className="text-sm">{worry.thought}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {format(parseISO(worry.created_at), 'PPP p')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteWorryMutation.mutate(worry.id)}
                    disabled={deleteWorryMutation.isPending}
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

export default WorryJournal;