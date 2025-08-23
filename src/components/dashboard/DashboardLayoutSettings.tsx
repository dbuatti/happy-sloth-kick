import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from "@/components/ui/label";
import { Switch } from '@/components/ui/switch';
import { useDashboardData } from '@/hooks/useDashboardData';
import { UserSettings, Json } from '@/types';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'react-hot-toast';

interface DashboardLayoutSettingsProps {
  settings: UserSettings | undefined;
  updateSettings: (updates: Partial<Omit<UserSettings, 'user_id'>>) => Promise<boolean>;
}

const DashboardLayoutSettings: React.FC<DashboardLayoutSettingsProps> = ({ settings, updateSettings }) => {
  const { customCards, updateCustomCard } = useDashboardData({});
  const [localVisiblePages, setLocalVisiblePages] = useState<Record<string, boolean>>(settings?.visible_pages as Record<string, boolean> || {});

  useEffect(() => {
    setLocalVisiblePages(settings?.visible_pages as Record<string, boolean> || {});
  }, [settings]);

  const handleToggleVisibility = async (cardId: string, isVisible: boolean) => {
    try {
      await updateCustomCard({ id: cardId, updates: { is_visible: isVisible } });
      toast.success('Card visibility updated!');
    } catch (error) {
      toast.error('Failed to update card visibility.');
      console.error('Error updating card visibility:', error);
    }
  };

  const handlePageVisibilityChange = async (pageKey: string, isVisible: boolean) => {
    const newVisiblePages = { ...localVisiblePages, [pageKey]: isVisible };
    setLocalVisiblePages(newVisiblePages);
    try {
      await updateSettings({ visible_pages: newVisiblePages as Json });
      toast.success('Page visibility updated!');
    } catch (error) {
      toast.error('Failed to update page visibility.');
      console.error('Error updating page visibility:', error);
    }
  };

  const availablePages = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'focusMode', label: 'Focus Mode' },
    { key: 'devSpace', label: 'Dev Space' },
    { key: 'sleepTracker', label: 'Sleep Tracker' },
    { key: 'myHub', label: 'My Hub' },
    { key: 'archive', label: 'Archive' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'projectTracker', label: 'Project Tracker' },
    { key: 'gratitudeJournal', label: 'Gratitude Journal' },
    { key: 'worryJournal', label: 'Worry Journal' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard Layout & Visibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Custom Card Visibility</h3>
          {customCards.length === 0 ? (
            <p className="text-muted-foreground">No custom cards to manage.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customCards.map((card) => (
                <div key={card.id} className="flex items-center justify-between p-3 border rounded-md">
                  <Label htmlFor={`card-visibility-${card.id}`}>{card.title}</Label>
                  <Switch
                    id={`card-visibility-${card.id}`}
                    checked={card.is_visible ?? true}
                    onCheckedChange={(checked) => handleToggleVisibility(card.id, checked)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Page Visibility</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availablePages.map((page) => (
              <div key={page.key} className="flex items-center justify-between p-3 border rounded-md">
                <Label htmlFor={`page-visibility-${page.key}`}>{page.label}</Label>
                <Switch
                  id={`page-visibility-${page.key}`}
                  checked={localVisiblePages[page.key] ?? true}
                  onCheckedChange={(checked) => handlePageVisibilityChange(page.key, checked)}
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardLayoutSettings;