import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { WorryEntry, NewWorryEntryData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

const WorryJournal = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [entries, setEntries] = useState<WorryEntry[]>([]);
  const [newThought, setNewThought] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('worry_journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEntries(data as WorryEntry[] || []);
    } catch (error: any) {
      setError(error.message);
      console.error('Error fetching worry entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [userId]);

  const addEntry = async () => {
    if (!userId || !newThought.trim()) return;
    setError(null);
    try {
      const newEntryData: NewWorryEntryData & { user_id: string } = {
        user_id: userId,
        thought: newThought,
      };
      const { data, error } = await supabase
        .from('worry_journal_entries')
        .insert(newEntryData)
        .select('*')
        .single();
      if (error) throw error;
      setEntries(prev => [data as WorryEntry, ...prev]);
      setNewThought('');
      toast.success('Worry recorded!');
    } catch (error: any) {
      setError(error.message);
      console.error('Error adding worry entry:', error);
      toast.error('Failed to record worry.');
    }
  };

  const deleteEntry = async (id: string) => {
    setError(null);
    try {
      const { error } = await supabase
        .from('worry_journal_entries')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setEntries(prev => prev.filter(entry => entry.id !== id));
      toast.success('Worry deleted!');
    } catch (error: any) {
      setError(error.message);
      console.error('Error deleting worry entry:', error);
      toast.error('Failed to delete worry.');
    }
  };

  if (loading) return <div className="text-center py-8">Loading worries...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error}</div>;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Worry Journal</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <div className="mb-4">
          <Textarea
            placeholder="Write down your worries or thoughts here..."
            value={newThought}
            onChange={(e) => setNewThought(e.target.value)}
            rows={3}
            className="mb-2"
          />
          <Button onClick={addEntry} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Add Thought
          </Button>
        </div>

        <div className="flex-grow overflow-y-auto space-y-4 pr-2">
          {entries.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No worries recorded yet. Take a moment to reflect.</p>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="bg-gray-50 p-3 rounded-lg shadow-sm flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-800 mb-1">{entry.thought}</p>
                  <p className="text-xs text-gray-500">{format(new Date(entry.created_at!), 'PPP p')}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteEntry(entry.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorryJournal;