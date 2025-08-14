import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Star } from 'lucide-react';

interface DoTodaySwitchProps {
  isOn: boolean;
  onToggle: () => void;
  disabled?: boolean; // Added disabled prop
}

const DoTodaySwitch: React.FC<DoTodaySwitchProps> = ({ isOn, onToggle, disabled }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Switch
            checked={isOn}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-yellow-500 data-[state=unchecked]:bg-gray-300"
            disabled={disabled} // Use disabled prop here
          >
            <Star className="h-4 w-4 text-white" />
          </Switch>
        </TooltipTrigger>
        <TooltipContent>
          {isOn ? "Mark as 'Do Today'" : "Remove from 'Do Today'"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default DoTodaySwitch;