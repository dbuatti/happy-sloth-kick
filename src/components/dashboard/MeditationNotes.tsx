import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserSettings } from '@/types'; // Corrected import path
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'sonner';

const MeditationNotes: React.FC = () => {
  const { settings, loading, updateSettings } = useSettings();
  const [notes, setNotes] = React.useState(settings?.meditation_notes || '');

  React.useEffect(() => {
    if (settings) {
      setNotes(settings.meditation_notes || '');
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings({ meditation_notes: notes });
      toast.success('Meditation notes saved!');
    } catch (error) {
      console.error('Failed to save meditation notes:', error);
      toast.error('Failed to save notes.');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meditation Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-24 mt-4 ml-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meditation Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Jot down your thoughts after meditation..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[120px]"
        />
        <div className="flex justify-end mt-4">
          <Button onClick={handleSave}>Save Notes</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MeditationNotes;