import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PomodoroSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
}

interface PomodoroSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PomodoroSettings;
  onSave: (newSettings: PomodoroSettings) => void;
}

const PomodoroSettingsDialog: React.FC<PomodoroSettingsDialogProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = React.useState(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pomodoro Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="work-duration" className="text-right col-span-2">Work Duration (min)</Label>
            <Input
              id="work-duration"
              type="number"
              value={localSettings.workDuration}
              onChange={(e) => setLocalSettings(s => ({ ...s, workDuration: parseInt(e.target.value) || 0 }))}
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="short-break" className="text-right col-span-2">Short Break (min)</Label>
            <Input
              id="short-break"
              type="number"
              value={localSettings.shortBreakDuration}
              onChange={(e) => setLocalSettings(s => ({ ...s, shortBreakDuration: parseInt(e.target.value) || 0 }))}
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="long-break" className="text-right col-span-2">Long Break (min)</Label>
            <Input
              id="long-break"
              type="number"
              value={localSettings.longBreakDuration}
              onChange={(e) => setLocalSettings(s => ({ ...s, longBreakDuration: parseInt(e.target.value) || 0 }))}
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sessions-long-break" className="text-right col-span-2">Sessions until Long Break</Label>
            <Input
              id="sessions-long-break"
              type="number"
              value={localSettings.sessionsUntilLongBreak}
              onChange={(e) => setLocalSettings(s => ({ ...s, sessionsUntilLongBreak: parseInt(e.target.value) || 0 }))}
              className="col-span-2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PomodoroSettingsDialog;