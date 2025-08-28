import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CustomCard } from '@/hooks/useDashboardData';
import { UserSettings } from '@/hooks/useUserSettings';

interface DashboardLayoutSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings | null;
  customCards: CustomCard[];
  updateSettings: (updates: Partial<UserSettings>) => Promise<boolean>;
  updateCustomCard: (args: { id: string; updates: Partial<Omit<CustomCard, 'id' | 'user_id'>> }) => Promise<CustomCard>;
}

const DashboardLayoutSettings: React.FC<DashboardLayoutSettingsProps> = ({
  isOpen,
  onClose,
  settings,
  customCards,
  updateSettings,
  updateCustomCard,
}) => {
  const handleToggleCardVisibility = async (cardId: string, isVisible: boolean) => {
    await updateCustomCard({ id: cardId, updates: { is_visible: isVisible } });
  };

  const handleToggleBuiltInCardVisibility = async (key: keyof UserSettings['dashboard_layout'], isVisible: boolean) => {
    if (settings) {
      await updateSettings({
        dashboard_layout: {
          ...settings.dashboard_layout,
          [key]: isVisible,
        },
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Customize Dashboard Layout</DialogTitle>
          <DialogDescription>
            Choose which cards are visible on your dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <h3 className="text-lg font-semibold">Built-in Cards</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="daily-briefing-visibility">Daily Briefing</Label>
              <Switch
                id="daily-briefing-visibility"
                checked={settings?.dashboard_layout?.dailyBriefingVisible ?? true}
                onCheckedChange={(checked) => handleToggleBuiltInCardVisibility('dailyBriefingVisible', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="daily-schedule-visibility">Daily Schedule Preview</Label>
              <Switch
                id="daily-schedule-visibility"
                checked={settings?.dashboard_layout?.dailyScheduleVisible ?? true}
                onCheckedChange={(checked) => handleToggleBuiltInCardVisibility('dailyScheduleVisible', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="weekly-focus-visibility">Weekly Focus</Label>
              <Switch
                id="weekly-focus-visibility"
                checked={settings?.dashboard_layout?.weeklyFocusVisible ?? true}
                onCheckedChange={(checked) => handleToggleBuiltInCardVisibility('weeklyFocusVisible', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="people-memory-visibility">People Memory</Label>
              <Switch
                id="people-memory-visibility"
                checked={settings?.dashboard_layout?.peopleMemoryVisible ?? true}
                onCheckedChange={(checked) => handleToggleBuiltInCardVisibility('peopleMemoryVisible', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="meditation-notes-visibility">Meditation Notes</Label>
              <Switch
                id="meditation-notes-visibility"
                checked={settings?.dashboard_layout?.meditationNotesVisible ?? true}
                onCheckedChange={(checked) => handleToggleBuiltInCardVisibility('meditationNotesVisible', checked)}
              />
            </div>
          </div>

          <h3 className="text-lg font-semibold mt-4">Custom Cards</h3>
          <div className="space-y-2">
            {customCards.length === 0 ? (
              <p className="text-muted-foreground text-sm">No custom cards added yet.</p>
            ) : (
              customCards.map((card) => (
                <div key={card.id} className="flex items-center justify-between">
                  <Label htmlFor={`custom-card-${card.id}`}>{card.emoji} {card.title}</Label>
                  <Switch
                    id={`custom-card-${card.id}`}
                    checked={card.is_visible}
                    onCheckedChange={(checked) => handleToggleCardVisibility(card.id, checked)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardLayoutSettings;