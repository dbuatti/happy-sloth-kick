import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Edit, Lightbulb, Calendar, BellRing, StickyNote, Link as LinkIcon } from 'lucide-react';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { getCategoryColorProps } from '@/lib/categoryColors';
import { format, parseISO } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from '@/components/ui/skeleton';
import NextTaskSuggestionPopup from './NextTaskSuggestionPopup'; // Import the new popup component

interface NextTaskSuggestionStripProps {
  task: Task | null;
  onMarkComplete: (taskId: string) => Promise<void>;
  onEditTask: (task: Task) => void;
  onOpenDetail?: (task: Task) => void;
  currentDate: Date;
  loading: boolean;
}

const NextTaskSuggestionStrip: React.FC<NextTaskSuggestionStripProps> = ({ task, onMarkComplete, onEditTask, onOpenDetail, currentDate, loading }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  if (loading) {
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-md mb-4 border-l-8 border-primary dark:border-primary h-10 flex items-center px-4">
        <Skeleton className="h-5 w-3/4" />
      </Card>
    );
  }

  if (!task) {
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-md mb-4 border-l-8 border-primary dark:border-primary h-10 flex items-center px-4">
        <p className="text-muted-foreground text-sm">No incomplete tasks found for today. Time to add some!</p>
      </Card>
    );
  }

  const getPriorityDotColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-priority-urgent';
      case 'high': return 'bg-priority-high';
      case 'medium': return 'bg-priority-medium';
      case 'low': return 'bg-priority-low';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card
      className={cn(
        "relative w-full max-w-3xl mx-auto shadow-md mb-4 h-10 flex items-center px-4 py-0.5", // Fixed height, reduced padding
        "border-l-8 border-primary dark:border-primary", // Always primary border for this strip
        "transition hover:shadow-lg active:scale-[0.995]",
        "overflow-hidden" // Hide overflow for text truncation
      )}
    >
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        <Lightbulb
          className="h-5 w-5 text-primary cursor-pointer flex-shrink-0" // 20px icon
          onClick={() => setIsPopupOpen(true)}
          aria-label="View next task details"
        />
        <span className="text-sm font-normal text-foreground truncate"> {/* 10px text */}
          Next Task: {task.description}
        </span>
      </div>

      {isPopupOpen && (
        <NextTaskSuggestionPopup
          task={task}
          isOpen={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
          onMarkComplete={onMarkComplete}
          onEditTask={onEditTask}
          onOpenDetail={onOpenDetail}
          currentDate={currentDate}
        />
      )}
    </Card>
  );
};

export default NextTaskSuggestionStrip;