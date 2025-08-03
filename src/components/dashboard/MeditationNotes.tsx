import React, { useState, useEffect } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import EditableCard from './EditableCard';
import { Leaf } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const MeditationNotesCard: React.FC = () => {
  const { settings, updateSettings, loading } = useDashboardData();
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setNotes(settings.meditation_notes || '');
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
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
        {settings.meditation_notes || 'No notes yet. Click edit to add some.'}
      </p>
    </EditableCard>
  );
};

export default MeditationNotesCard;