import React, { useState, useEffect } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import EditableCard from './EditableCard';
import { LifeBuoy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const SupportLinkCard: React.FC = () => {
  const { settings, updateSettings, loading } = useDashboardData();
  const [link, setLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setLink(settings.support_link || '');
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    await updateSettings({ support_link: link });
    setIsSaving(false);
  };

  if (loading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const renderEditForm = () => (
    <div>
      <Label>Support Link URL</Label>
      <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
    </div>
  );

  return (
    <EditableCard title="Support Link" icon={LifeBuoy} onSave={handleSave} renderEditForm={renderEditForm} isSaving={isSaving}>
      {settings.support_link ? (
        <Button asChild className="w-full">
          <a href={settings.support_link} target="_blank" rel="noopener noreferrer">
            Chat with my support
          </a>
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">No support link set. Click edit to add one.</p>
      )}
    </EditableCard>
  );
};

export default SupportLinkCard;