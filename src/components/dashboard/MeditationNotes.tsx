import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MeditationNotesCardProps } from '@/types';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'react-hot-toast';

const MeditationNotes: React.FC<MeditationNotesCardProps> = ({ isDemo = false, demoUserId }) => {
  const { settings, isLoading, error, updateSettings } = useSettings();
  const [notes, setNotes] = useState(settings?.meditation_notes || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setNotes(settings.meditation_notes || '');
    }
  }, [settings]);

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await updateSettings({ meditation_notes: notes });
      toast.success('Meditation notes saved!');
    } catch (err) {
      toast.error('Failed to save notes.');
      console.error('Error saving meditation notes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Meditation Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Meditation Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading notes: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Meditation Notes</CardTitle>
        <Button variant="ghost" size="sm" onClick={handleSaveNotes} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Jot down your thoughts after meditation..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[100px]"
        />
      </CardContent>
    </Card>
  );
};

export default MeditationNotes;