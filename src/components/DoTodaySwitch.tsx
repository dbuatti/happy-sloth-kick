import React from 'react';
import { Switch } from "@/components/ui/switch";
import { cn } from '@/lib/utils';

interface DoTodaySwitchProps {
  isOn: boolean;
  onToggle: (checked: boolean) => void;
  taskId: string;
  isDemo?: boolean;
}

const DoTodaySwitch: React.FC<DoTodaySwitchProps> = ({ isOn, onToggle, taskId, isDemo = false }) => {
  return (
    <div className="flex items-center"> {/* Removed onClick={(e) => e.stopPropagation()} */}
      <Switch
        id={`do-today-${taskId}`}
        checked={isOn}
        onCheckedChange={onToggle}
        disabled={isDemo}
        className={cn(
          "data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30",
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            isOn ? 'translate-x-4' : 'translate-x-0',
            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out"
          )}
        />
      </Switch>
    </div>
  );
};

export default DoTodaySwitch;