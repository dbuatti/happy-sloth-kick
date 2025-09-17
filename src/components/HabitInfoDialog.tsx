import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Flame, CalendarDays, StickyNote, Target, Clock, Scale } from 'lucide-react';
import { HabitWithLogs } from '@/hooks/useHabits';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface HabitInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  habit: HabitWithLogs | null;
}

const HabitInfoDialog: React.FC<HabitInfoDialogProps> = ({ isOpen, onClose, habit }) => {
  if (!habit) return null;

  const getUnitDisplay = (value: number | null, unit: string | null) => {
    if (value === null || unit === null || unit === '') return '';
    
    let formattedUnit = unit;
    if (value > 1 && !unit.endsWith('s') && unit !== 'reps' && unit !== 'times') {
      formattedUnit += 's';
    }

    switch (unit.toLowerCase()) {
      case 'minutes': return `${value} min`;
      case 'kilometers': return `${value} km`;
      case 'miles': return `${value} mi`;
      case 'liters': return `${value} L`;
      case 'milliliters': return `${value} ml`;
      case 'glasses': return `${value} glasses`;
      case 'reps': return `${value} reps`;
      case 'pages': return `${value} pages`;
      case 'times': return `${value} times`;
      case 'steps': return `${value} steps`;
      default: return `${value} ${formattedUnit}`;
    }
  };

  const showTargetValue = habit.target_value !== null && habit.unit !== null && habit.unit !== 'none-unit';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" /> {habit.name} Details
          </DialogTitle>
          <DialogDescription>
            All the information about your habit at a glance.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3 text-sm text-muted-foreground">
          {habit.description && (
            <div className="flex items-start gap-2">
              <StickyNote className="h-4 w-4 flex-shrink-0" />
              <p className="flex-1 whitespace-pre-wrap">{habit.description}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span>Started: <span className="font-semibold text-foreground">{format(parseISO(habit.start_date), 'MMM d, yyyy')}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span>Current Streak: <span className="font-semibold text-foreground">{habit.currentStreak} days</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span>Longest Streak: <span className="font-semibold text-foreground">{habit.longestStreak} days</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Frequency: <span className="font-semibold text-foreground capitalize">{habit.frequency}</span></span>
          </div>
          {showTargetValue && (
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span>Target: <span className="font-semibold text-foreground">{getUnitDisplay(habit.target_value, habit.unit)}</span></span>
            </div>
          )}
          {habit.unit && habit.unit !== 'none-unit' && (
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              <span>Unit: <span className="font-semibold text-foreground capitalize">{habit.unit}</span></span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className={cn("w-3.5 h-3.5 rounded-full border", `border-[${habit.color}]`)} style={{ backgroundColor: habit.color }} />
            <span>Color: <span className="font-semibold text-foreground">{habit.color}</span></span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HabitInfoDialog;