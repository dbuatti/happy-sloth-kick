"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Switch } from "@/components/ui/switch";

interface DoTodaySwitchProps {
  isOn: boolean;
  onToggle: () => void;
  isDemo?: boolean;
}

const DoTodaySwitch: React.FC<DoTodaySwitchProps> = ({ isOn, onToggle, isDemo }) => {
  return (
    <Switch
      checked={isOn}
      onCheckedChange={() => { // Removed 'checked' parameter
        onToggle();
      }}
      disabled={isDemo}
      className={cn(
        "data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-700",
        "transition-colors duration-200"
      )}
      aria-label={isOn ? 'Remove from Do Today' : 'Add to Do Today'}
      onClick={(e) => e.stopPropagation()}
    />
  );
};

export default DoTodaySwitch;