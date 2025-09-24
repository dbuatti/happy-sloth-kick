import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HabitWithLogs } from '@/hooks/useHabits';
import { format, parseISO } from 'date-fns';
import { Flame, CalendarDays, Target, Clock, Repeat } from 'lucide-react';
import HabitIconDisplay from './HabitIconDisplay';

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
      default: return `${value} ${formattedUnit}`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HabitIconDisplay iconName={habit.icon} color={habit.color} size="md" />
            {habit.name}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4 text-sm text-muted-foreground">
          {habit.description && (
            <div>
              <h4 className="font-semibold text-foreground">Description:</h4>
              <p>{habit.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-y-2">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span>Current Streak: <span className="font-semibold text-foreground">{habit.currentStreak} days</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span>Longest Streak: <span className="font-semibold text-foreground">{habit.longestStreak} days</span></span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span>Started: <span className="font-semibold text-foreground">{format(parseISO(habit.start_date), 'MMM d, yyyy')}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              <span>Frequency: <span className="font-semibold text-foreground capitalize">{habit.frequency}</span></span>
            </div>
            {habit.target_value !== null && habit.unit !== null && habit.unit !== 'none-unit' && (
              <div className="flex items-center gap-2 col-span-2">
                <Target className="h-4 w-4" />
                <span>Target: <span className="font-semibold text-foreground">{getUnitDisplay(habit.target_value, habit.unit)} {habit.goal_type}</span></span>
              </div>
            )}
            {habit.duration !== null && (
              <div className="flex items-center gap-2 col-span-2">
                <Clock className="h-4 w-4" />
                <span>Duration: <span className="font-semibold text-foreground">{habit.duration} minutes</span></span>
              </div>
            )}
          </div>

          {habit.micro_steps && habit.micro_steps.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground">Micro-steps:</h4>
              <ul className="list-disc list-inside pl-4 space-y-1">
                {habit.micro_steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          {habit.reminders && habit.reminders.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground">Reminders:</h4>
              <ul className="list-disc list-inside pl-4 space-y-1">
                {habit.reminders.map((time, index) => (
                  <li key={index}>{time}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HabitInfoDialog;