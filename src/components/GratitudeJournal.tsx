import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Heart, Plus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GratitudeEntry {
  id: string;
  user_id: string;
  entry: string;
  created_at: string;
}

const GratitudeJournal: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [newEntry, setNewEntry] = useState('');
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [entryToDeleteId, setEntryToDeleteId] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!userId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gratitude_journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      console.error('Error fetching gratitude entries:', error.message);
      showError('Failed to load gratitude journal entries.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleAddEntry = async () => {
    if (!newEntry.trim()) {
      showError('Entry cannot be empty.');
      return;
    }
    if (!userId) {
      showError('User not authenticated.');
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('gratitude_journal_entries')
        .insert({ user_id: userId, entry: newEntry.trim() })
        .select()
        .single();

      if (error) throw error;
      setEntries(prev => [data, ...prev]);
      setNewEntry('');
      showSuccess('Gratitude entry saved!');
    } catch (error: any) {
      console.error('Error saving gratitude entry:', error.message);
      showError('Failed to save gratitude entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (entryId: string) => {
    setEntryToDeleteId(entryId);
    setShowConfirmDeleteDialog(true);
  };

  const confirmDeleteEntry = async () => {
    if (!entryToDeleteId || !userId) {
      setShowConfirmDeleteDialog(false);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('gratitude_journal_entries')
        .delete()
        .eq('id', entryToDeleteId)
        .eq('user_id', userId);

      if (error) throw error;
      setEntries(prev => prev.filter(entry => entry.id !== entryToDeleteId));
      showSuccess('Gratitude entry deleted!');
    } catch (error: any) {
      console.error('Error deleting gratitude entry:', error.message);
      showError('Failed to delete gratitude entry.');
    } finally {
      setIsSaving(false);
      setShowConfirmDeleteDialog(false);
      setEntryToDeleteId(null);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
          <Heart className="h-6 w-6 text-primary" /> Gratitude Journal
        </CardTitle>
        <p className="text-muted-foreground text-center">
          Cultivate a positive mindset by noting what you're grateful for.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="What are you grateful for today?"
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            rows={3}
            disabled={isSaving}
            className="min-h-[80px]"
          />
          <Button onClick={handleAddEntry} className="w-full h-9" disabled={isSaving || !newEntry.trim()}>
            <Plus className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Add Entry'}
          </Button>
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          <h3 className="text-lg font-semibold">Past Entries</h3>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center">No entries yet. Start writing!</p>
          ) : (
            <ul className="space-y-2">
              {entries.map(entry => (
                <li key={entry.id} className="p-3 rounded-md bg-background flex justify-between items-start gap-2 shadow-sm">
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{entry.entry}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(parseISO(entry.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive flex-shrink-0"
                    onClick={() => handleDeleteClick(entry.id)}
                    disabled={isSaving}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>

      <AlertDialog open={showConfirmDeleteDialog} onOpenChange={setShowConfirmDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this gratitude entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEntry} disabled={isSaving}>
              {isSaving ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default GratitudeJournal;