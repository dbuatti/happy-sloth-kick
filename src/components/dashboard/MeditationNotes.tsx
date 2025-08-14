import React, { useState, useEffect } from 'react';
import EditableCard from './EditableCard';
import { Leaf } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { UserSettings } from '@/hooks/useUserSettings'; // Import UserSettings type

interface MeditationNotesCardProps {
  settings: UserSettings | null; // Updated to UserSettings | null
  updateSettings: (updates: Partial<Omit<UserSettings, 'user_id'>>) => Promise<boolean>; // Updated to match useUserSettings's updateSettings
  loading: boolean;
}

const MeditationNotesCard: React.FC<MeditationNotesCardProps> = ({ settings, updateSettings, loading }) => {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setNotes(settings.meditation_notes || '');
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    // Ensure updates match the Partial<Omit<UserSettings, 'user_id'>> expected by useSettings
    await updateSettings({ meditation_notes: notes });
    setIsSaving(false);
  };

  if (loading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const renderEditForm = () => (
    <div>
      <Label>Meditation Notes</Label>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Up to recording #5..." />
    </div>
  );

  return (
    <EditableCard title="Meditation Notes" icon={Leaf} onSave={handleSave} renderEditForm={renderEditForm} isSaving={isSaving}>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
        {settings?.meditation_notes || 'No notes yet. Click edit to add some.'}
      </p>
    </EditableCard>
  );
};

export default MeditationNotesCard;