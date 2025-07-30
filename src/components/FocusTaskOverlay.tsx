import React from 'react';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { XCircle, CheckCircle2, Timer as TimerIcon } from 'lucide-react'; // Import CheckCircle2 and TimerIcon
import { Button } from '@/components/ui/button'; // Import Button component

interface FocusTaskOverlayProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onClearManualFocus: () => void; // New prop to clear manual focus
  onMarkComplete: (taskId: string) => Promise<void>; // New prop for marking task complete
  onStartFocusTimer: (durationMinutes: number, taskId: string) => void; // New prop for starting timer
}

const FocusTaskOverlay: React.FC<FocusTaskOverlayProps> = ({ task, isOpen, onClose, onClearManualFocus, onMarkComplete, onStartFocusTimer }) => {
  if (!isOpen || !task) {
    return null;
  }

  const handleClearAndClose = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent closing the overlay immediately
    onClearManualFocus();
    onClose();
  };

  const handleMarkCompleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onMarkComplete(task.id);
    onClose();
  };

  const handleStartTimerClick = (e: React.MouseEvent, duration: number) => {
    e.stopPropagation();
    onStartFocusTimer(duration, task.id);
    onClose(); // Close overlay after starting timer
  };

  const timerDurations = [2, 5, 10, 15, 20, 25, 30];

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center", // Removed p-4 here
        "bg-primary text-primary-foreground cursor-pointer"
      )}
      onClick={onClose}
    >
      <div className="max-w-4xl mx-auto text-center p-4"> {/* Added p-4 here */}
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
          {task.description}
        </h1>
        {task.notes && (
          <p className="mt-6 text-xl md:text-2xl opacity-80 max-w-2xl mx-auto">
            {task.notes}
          </p>
        )}

        <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
          <Button
            onClick={handleMarkCompleteClick}
            className="bg-green-500 hover:bg-green-600 text-white text-lg px-6 py-3 rounded-lg shadow-lg"
          >
            <CheckCircle2 className="h-6 w-6 mr-2" /> Mark Complete
          </Button>
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Start Focus Timer:</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {timerDurations.map(duration => (
              <Button
                key={duration}
                onClick={(e) => handleStartTimerClick(e, duration)}
                className="bg-secondary hover:bg-secondary-foreground text-secondary-foreground hover:text-primary-foreground text-md px-4 py-2 rounded-lg shadow-md"
              >
                <TimerIcon className="h-4 w-4 mr-2" /> {duration} min
              </Button>
            ))}
          </div>
        </div>
      </div>
      <button
        className="absolute top-4 right-4 text-primary-foreground opacity-70 hover:opacity-100 transition-opacity duration-200"
        onClick={handleClearAndClose}
        aria-label="Clear manual focus and close"
      >
        <XCircle className="h-8 w-8" />
      </button>
    </div>
  );
};

export default FocusTaskOverlay;