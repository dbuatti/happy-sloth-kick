"use client";

import React from 'react';
import { Switch } from "@/components/ui/switch";
import { cn } from '@/lib/utils';

interface DoTodaySwitchProps {
  isOn: boolean;
  onToggle: () => void;
  taskId: string;
  isDemo?: boolean;
}

const DoTodaySwitch = React.forwardRef<HTMLButtonElement, DoTodaySwitchProps>(
  ({ isOn, onToggle, taskId, isDemo, ...props }, ref) => {
    return (
      <Switch
        ref={ref}
        id={`do-today-switch-${taskId}`}
        checked={isOn}
        onCheckedChange={onToggle}
        disabled={isDemo}
        className={cn(
          "data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground",
          "h-5 w-9"
        )}
        aria-label={isOn ? 'Remove from Do Today' : 'Add to Do Today'}
        {...props}
      />
    );
  }
);

DoTodaySwitch.displayName = "DoTodaySwitch";

export default DoTodaySwitch;