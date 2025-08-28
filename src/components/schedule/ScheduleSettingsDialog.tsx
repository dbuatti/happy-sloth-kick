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
import { UserSettings } from '@/hooks/useUserSettings';

interface ScheduleSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings | null;
  updateSettings: (updates: Partial<UserSettings>) => Promise<boolean>;
  isDemo?: boolean;
}

const ScheduleSettingsDialog: React.FC<ScheduleSettingsDialogProps> = ({
  isOpen,
  onClose,
  settings,
  updateSettings,
  isDemo,
}) => {
  const handleToggleFocusTasksOnly = async (checked: boolean) => {
    if (!isDemo) {
      await updateSettings({ schedule_show_focus_tasks_only: checked });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Settings</DialogTitle>
          <DialogDescription>Configure how your daily schedule is displayed.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show-focus-tasks-only">Show Focus Tasks Only</Label>
            <Switch
              id="show-focus-tasks-only"
              checked={settings?.schedule_show_focus_tasks_only ?? true}
              onCheckedChange={handleToggleFocusTasksOnly}
              disabled={isDemo}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            When enabled, only tasks marked as "Do Today" or in focus mode sections will appear in the unscheduled tasks panel.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleSettingsDialog;