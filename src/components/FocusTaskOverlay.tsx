import React from 'react';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface FocusTaskOverlayProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

const FocusTaskOverlay: React.FC<FocusTaskOverlayProps> = ({ task, isOpen, onClose }) => {
  if (!isOpen || !task) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center p-4",
        "bg-primary text-primary-foreground cursor-pointer" // Reverted to text-primary-foreground
      )}
      onClick={onClose}
    >
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
          {task.description}
        </h1>
        {task.notes && (
          <p className="mt-6 text-xl md:text-2xl opacity-80 max-w-2xl mx-auto">
            {task.notes}
          </p>
        )}
      </div>
    </div>
  );
};

export default FocusTaskOverlay;