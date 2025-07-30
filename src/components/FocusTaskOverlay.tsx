import React from 'react';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { XCircle } from 'lucide-react'; // Import XCircle icon

interface FocusTaskOverlayProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onClearManualFocus: () => void; // New prop to clear manual focus
}

const FocusTaskOverlay: React.FC<FocusTaskOverlayProps> = ({ task, isOpen, onClose, onClearManualFocus }) => {
  if (!isOpen || !task) {
    return null;
  }

  const handleClearAndClose = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent closing the overlay immediately
    onClearManualFocus();
    onClose();
  };

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