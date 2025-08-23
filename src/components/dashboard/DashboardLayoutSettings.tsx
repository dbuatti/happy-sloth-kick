import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useDashboardData, CustomCard } from '@/hooks/useDashboardData';
import { UserSettings } from '@/hooks/useUserSettings'; // Import UserSettings type

interface DashboardLayoutSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings | null; // Updated to UserSettings | null
  customCards: CustomCard[];
  updateSettings: (updates: Partial<Omit<UserSettings, 'user_id'>>) => Promise<boolean>; // Updated to match useUserSettings's updateSettings
  updateCustomCard: ReturnType<typeof useDashboardData>['updateCustomCard'];
}

const DashboardLayoutSettings: React.FC<DashboardLayoutSettingsProps> = ({
  isOpen,
  onClose,
  settings,
  customCards,
  updateSettings,
  updateCustomCard,
}) => {
  const handleToggleBuiltIn = (cardKey: string, checked: boolean) => {
    if (!settings) return; // Ensure settings is not null
    const newLayout = {
      ...(settings.dashboard_layout || {}), // Ensure it's an object
      [cardKey]: checked
    };
    // Ensure updates match the Partial<Omit<UserSettings, 'user_id'>> expected by useSettings
    updateSettings({ dashboard_layout: newLayout });
  };

  const handleToggleCustom = (cardId: string, checked: boolean) => {
    updateCustomCard({ id: cardId, updates: { is_visible: checked } });
  };

  const builtInCards = [
    { key: 'dailyBriefingVisible', label: 'Daily Briefing' },
    { key: 'dailyScheduleVisible', label: 'Daily Schedule Preview' },
    { key: 'weeklyFocusVisible', label: "This Week's Focus" },
    { key: 'peopleMemoryVisible', label: 'People Memory' },
    { key: 'meditationNotesVisible', label: 'Meditation Notes' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <h4 className="font-semibold">Built-in Cards</h4>
          {builtInCards.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`toggle-${key}`}>{label}</Label>
              <Switch
                id={`toggle-${key}`}
                checked={settings?.dashboard_layout?.[key] !== false} // Safely access layout property
                onCheckedChange={(checked) => handleToggleBuiltIn(key, checked)}
              />
            </div>
          ))}
          {customCards.length > 0 && (
            <>
              <hr className="my-4" />
              <h4 className="font-semibold">Your Custom Cards</h4>
              {customCards.map(card => (
                <div key={card.id} className="flex items-center justify-between">
                  <Label htmlFor={`toggle-${card.id}`}>{card.title}</Label>
                  <Switch
                    id={`toggle-${card.id}`}
                    checked={card.is_visible}
                    onCheckedChange={(checked) => handleToggleCustom(card.id, checked)}
                  />
                </div>
              ))}
            </>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardLayoutSettings;