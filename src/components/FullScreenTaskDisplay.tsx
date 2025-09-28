"use client";

import React from 'react';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { X, Calendar as CalendarIcon, Repeat, Link as LinkIcon, ClipboardCopy, CalendarClock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Appointment } from '@/hooks/useAppointments';

interface FullScreenTaskDisplayProps {
  task: Task;
  isOpen: boolean; // Added this prop
  onClose: () => void;
  sections: TaskSection[];
  allCategories: Category[];
  scheduledTasksMap: Map<string, Appointment>;
}

const FullScreenTaskDisplay: React.FC<FullScreenTaskDisplayProps> = ({
  task,
  onClose,
  sections,
  allCategories,
  scheduledTasksMap,
}) => {
  const category = allCategories.find(cat => cat.id === task.category);
  const section = sections.find(sec => sec.id === task.section_id);
  const scheduledAppointment = scheduledTasksMap.get(task.id);

  const getPriorityColorClass = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-priority-urgent';
      case 'high': return 'bg-priority-high';
      case 'medium': return 'bg-priority-medium';
      case 'low': return 'bg-priority-low';
      default: return 'bg-gray-500';
    }
  };

  const isUrl = (path: string) => path.startsWith('http://') || path.startsWith('https://');

  const handleCopyPath = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(path);
      // You might want to add a toast notification here
    } catch (err) {
      // You might want to add a toast notification here
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col p-4 sm:p-6 md:p-8 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Task Focus</h1>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close full screen task view">
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="bg-card p-6 rounded-lg shadow-lg space-y-4">
          <div className="flex items-center gap-3">
            <div className={cn("h-4 w-4 rounded-full", getPriorityColorClass(task.priority))} />
            <h2 className="text-2xl font-semibold">{task.description}</h2>
          </div>

          {task.notes && (
            <div>
              <h3 className="text-lg font-medium text-muted-foreground">Notes:</h3>
              <p className="text-base whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {category && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Category:</span>
                <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: category.color, color: 'white' }}>
                  {category.name}
                </span>
              </div>
            )}

            {section && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Section:</span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
                  {section.name}
                </span>
              </div>
            )}

            {task.due_date && (
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">Due Date:</span>
                <span>{format(parseISO(task.due_date), 'PPP')}</span>
              </div>
            )}

            {task.remind_at && (
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">Reminder:</span>
                <span>{format(parseISO(task.remind_at), 'PPP p')}</span>
              </div>
            )}

            {task.recurring_type !== 'none' && (
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">Recurring:</span>
                <span>{task.recurring_type.charAt(0).toUpperCase() + task.recurring_type.slice(1)}</span>
              </div>
            )}

            {task.link && (
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">Link:</span>
                {isUrl(task.link) ? (
                  <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate max-w-[200px]">
                    {task.link}
                  </a>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1 text-muted-foreground hover:text-primary"
                        onClick={(e) => handleCopyPath(e, task.link!)}
                      >
                        <ClipboardCopy className="h-4 w-4 mr-1" /> Copy Path
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy path: {task.link}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}

            {scheduledAppointment && (
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">Scheduled:</span>
                <span>
                  {format(parseISO(scheduledAppointment.date), 'PPP')} {format(parseISO(`1970-01-01T${scheduledAppointment.start_time}`), 'h:mm a')}
                </span>
              </div>
            )}
          </div>

          {task.image_url && (
            <div className="mt-4">
              <h3 className="text-lg font-medium text-muted-foreground mb-2">Image:</h3>
              <img src={task.image_url} alt="Task illustration" className="max-w-full h-auto rounded-lg shadow-md" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FullScreenTaskDisplay;