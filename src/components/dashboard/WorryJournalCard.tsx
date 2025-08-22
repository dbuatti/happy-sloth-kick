import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { useWorryJournal } from '@/hooks/useWorryJournal';
import { useAuth } from '@/context/AuthContext';
import { WorryJournalEntry } from '@/types/task';
import { format } from 'date-fns';
import { WorryJournalCardProps } from '@/types/props';

const WorryJournalCard: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    entries,
    isLoading,
    error,
    addEntry,
    deleteEntry,
  } = useWorryJournal({ userId });

  const [newThought, setNewThought] = useState('');

  const handleAddEntry = async () => {
    if (!newThought.trim()) return;
    await addEntry(newThought.trim());
    setNewThought('');
  };

  const handleDeleteEntry = async (entryId: string) => {
    await deleteEntry(entryId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Worry Journal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Worry Journal</CardTitle>
        </CardHeader>
        <CardContent className="text-red-500">Error loading journal entries.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Worry Journal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Textarea
            placeholder="What's on your mind?"
            value={newThought}
            onChange={(e) => setNewThought(e.target.value)}
            className="flex-grow"
          />
          <Button onClick={handleAddEntry} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="text-gray-500 text-sm">No entries yet. Write down your thoughts.</p>
          ) : (
            entries.map((entry: WorryJournalEntry) => (
              <div key={entry.id} className="flex items-start justify-between p-2 border rounded-md text-sm">
                <p className="flex-grow pr-2">{entry.thought}</p>
                <div className="flex-shrink-0 flex items-center space-x-2">
                  <span className="text-xs text-gray-500">{format(new Date(entry.created_at), 'MMM d')}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteEntry(entry.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorryJournalCard;