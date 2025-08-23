import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, Edit } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { MeditationNotesCardProps } from '@/types';

const MeditationNotes: React.FC<MeditationNotesCardProps> = () => {
  const { settings, updateSettings, loading } = useSettings();
  const [notes, setNotes] = useState(settings?.meditation_notes || '');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setNotes(settings?.meditation_notes || '');
  }, [settings?.meditation_notes]);

  const handleSaveNotes = async () => {
    await updateSettings({ meditation_notes: notes });
    setIsEditing(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meditation Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Meditation Notes</CardTitle>
        {isEditing ? (
          <Button variant="ghost" size="sm" onClick={handleSaveNotes}>
            <Save className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your meditation notes here..."
            className="min-h-[100px]"
          />
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {notes || 'No notes yet. Click the edit icon to add some.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MeditationNotes;