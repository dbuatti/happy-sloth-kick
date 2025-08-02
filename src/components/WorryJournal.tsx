import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Brain, Plus, Trash2 } from 'lucide-react';
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

interface WorryEntry {
  id: string;
  user_id: string;
  thought: string;
  created_at: string;
}

const WorryJournal: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [newThought, setNewThought] = useState('');
  const [entries, setEntries] = useState<WorryEntry[]>([]);
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
        .from('worry_journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      console.error('Error fetching worry entries:', error.message);
      showError('Failed to load worry journal entries.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleAddThought = async () => {
    if (!newThought.trim()) {
      showError('Thought cannot be empty.');
      return;
    }
    if (!userId) {
      showError('User not authenticated.');
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('worry_journal_entries')
        .insert({ user_id: userId, thought: newThought.trim() })
        .select()
        .single();

      if (error) throw error;
      setEntries(prev => [data, ...prev]);
      setNewThought('');
      showSuccess('Thought saved!');
    } catch (error: any) {
      console.error('Error saving thought:', error.message);
      showError('Failed to save thought.');
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
        .from('worry_journal_entries')
        .delete()
        .eq('id', entryToDeleteId)
        .eq('user_id', userId);

      if (error) throw error;
      setEntries(prev => prev.filter(entry => entry.id !== entryToDeleteId));
      showSuccess('Thought deleted!');
    } catch (error: any) {
      console.error('Error deleting thought:', error.message);
      showError('Failed to delete thought.');
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
          <Brain className="h-6 w-6 text-primary" /> Worry Journal
        </CardTitle>
        <p className="text-muted-foreground text-center">
          Jot down intrusive thoughts to gain perspective.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="What's on your mind?"
            value={newThought}
            onChange={(e) => setNewThought(e.target.value)}
            rows={3}
            disabled={isSaving}
            className="min-h-[80px]"
          />
          <Button onClick={handleAddThought} className="w-full h-9" disabled={isSaving || !newThought.trim()}>
            <Plus className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Add Thought'}
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
                    <p className="text-sm text-foreground">{entry.thought}</p>
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
              This action cannot be undone. This will permanently delete this journal entry.
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

export default WorryJournal;