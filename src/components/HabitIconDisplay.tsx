import React from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

interface HabitIconDisplayProps {
  iconName: string | null;
  color: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg'; // New size prop
}

const HabitIconDisplay: React.FC<HabitIconDisplayProps> = ({ iconName, color, className, size = 'md' }) => {
  const IconComponent = iconName ? (LucideIcons as any)[iconName] : LucideIcons.Flame; // Default to Flame

  const sizeClasses = cn({
    'h-8 w-8': size === 'sm',
    'h-10 w-10': size === 'md',
    'h-12 w-12': size === 'lg',
  });

  const iconSizeClasses = cn({
    'h-4 w-4': size === 'sm',
    'h-5 w-5': size === 'md',
    'h-6 w-6': size === 'lg',
  });

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full flex-shrink-0",
        sizeClasses,
        className
      )}
      style={{ backgroundColor: color, opacity: 0.15 }}
    >
      <IconComponent className={iconSizeClasses} style={{ color: color }} />
    </div>
  );
};

export default HabitIconDisplay;