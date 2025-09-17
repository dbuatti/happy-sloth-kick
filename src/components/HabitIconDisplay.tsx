import React from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

interface HabitIconDisplayProps {
  iconName: string | null;
  color: string;
  className?: string;
}

const HabitIconDisplay: React.FC<HabitIconDisplayProps> = ({ iconName, color, className }) => {
  const IconComponent = iconName ? (LucideIcons as any)[iconName] : LucideIcons.Flame; // Default to Flame

  return (
    <div
      className={cn(
        "flex items-center justify-center h-14 w-14 rounded-xl flex-shrink-0",
        className
      )}
      style={{ backgroundColor: color, opacity: 0.15 }}
    >
      <IconComponent className="h-8 w-8" style={{ color: color }} />
    </div>
  );
};

export default HabitIconDisplay;