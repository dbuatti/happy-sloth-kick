"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DoTodaySwitchProps {
  isOn: boolean;
  onToggle: () => void;
  // taskId: string; // Removed as it's not used
  isDemo?: boolean;
}

const DoTodaySwitch: React.FC<DoTodaySwitchProps> = ({ isOn, onToggle, isDemo }) => {
  return (
    <Button
      variant={isOn ? "secondary" : "outline"}
      size="icon"
      onClick={(e) => {
        e.stopPropagation(); // Crucial: Stop event propagation to parent elements
        onToggle();
      }}
      disabled={isDemo}
      className={cn(
        "h-7 w-7 rounded-full transition-colors duration-200",
        isOn ? "bg-green-500 hover:bg-green-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
      )}
      aria-label={isOn ? 'Remove from Do Today' : 'Add to Do Today'}
    >
      {isOn ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
    </Button>
  );
};

export default DoTodaySwitch;