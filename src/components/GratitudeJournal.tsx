import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GratitudeEntry, NewGratitudeEntryData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

const GratitudeJournal = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [newEntry, setNewEntry] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('gratitude_journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEntries(data as GratitudeEntry[] || []);
    } catch (error: any) {
      setError(error.message);
      console.error('Error fetching gratitude entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [userId]);

  const addEntry = async () => {
    if (!userId || !newEntry.trim()) return;
    setError(null);
    try {
      const newEntryData: NewGratitudeEntryData & { user_id: string } = {
        user_id: userId,
        entry: newEntry,
      };
      const { data, error } = await supabase
        .from('gratitude_journal_entries')
        .insert(newEntryData)
        .select('*')
        .single();
      if (error) throw error;
      setEntries(prev => [data as GratitudeEntry, ...prev]);
      setNewEntry('');
      toast.success('Gratitude recorded!');
    } catch (error: any) {
      setError(error.message);
      console.error('Error adding gratitude entry:', error);
      toast.error('Failed to record gratitude.');
    }
  };

  const deleteEntry = async (id: string) => {
    setError(null);
    try {
      const { error } = await supabase
        .from('gratitude_journal_entries')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setEntries(prev => prev.filter(entry => entry.id !== id));
      toast.success('Gratitude entry deleted!');
    } catch (error: any) {
      setError(error.message);
      console.error('Error deleting gratitude entry:', error);
      toast.error('Failed to delete gratitude entry.');
    }
  };

  if (loading) return <div className="text-center py-8">Loading gratitude entries...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error}</div>;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Gratitude Journal</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <div className="mb-4">
          <Textarea
            placeholder="What are you grateful for today?"
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            rows={3}
            className="mb-2"
          />
          <Button onClick={addEntry} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Add Entry
          </Button>
        </div>

        <div className="flex-grow overflow-y-auto space-y-4 pr-2">
          {entries.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No gratitude entries yet. Start by adding one!</p>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="bg-gray-50 p-3 rounded-lg shadow-sm flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-800 mb-1">{entry.entry}</p>
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

export default GratitudeJournal;