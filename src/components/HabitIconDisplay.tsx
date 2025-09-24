import React from 'react';
import {
  Dumbbell, BookOpen, Sun, Moon, Coffee, UtensilsCrossed, Water, Heart,
  Medal, Target, Zap, Lightbulb, Shield, Star, Smile, Cloud, Feather,
  Leaf, Mountain, Waves, Wind, Bell, Clock, Calendar, CheckCircle2,
  X, MoreHorizontal, Edit, Flame, CalendarDays, Pencil as PencilIcon, Sparkles, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HabitIconDisplayProps {
  iconName: string | null;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const iconMap: { [key: string]: React.ElementType } = {
  Dumbbell, BookOpen, Sun, Moon, Coffee, UtensilsCrossed, Water, Heart,
  Medal, Target, Zap, Lightbulb, Shield, Star, Smile, Cloud, Feather,
  Leaf, Mountain, Waves, Wind, Bell, Clock, Calendar, CheckCircle2,
  X, MoreHorizontal, Edit, Flame, CalendarDays, PencilIcon, Sparkles, Info,
};

const HabitIconDisplay: React.FC<HabitIconDisplayProps> = ({ iconName, color, size = 'md', className }) => {
  const IconComponent = iconName ? iconMap[iconName] : Dumbbell; // Default to Dumbbell if not found

  const iconSizeClasses = cn({
    'h-4 w-4': size === 'sm',
    'h-5 w-5': size === 'md',
    'h-6 w-6': size === 'lg',
  });

  const containerSizeClasses = cn({
    'h-8 w-8': size === 'sm',
    'h-10 w-10': size === 'md',
    'h-12 w-12': size === 'lg',
  });

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center",
        containerSizeClasses,
        className
      )}
      style={{ backgroundColor: color || 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
    >
      <IconComponent className={cn(iconSizeClasses)} />
    </div>
  );
};

export default HabitIconDisplay;