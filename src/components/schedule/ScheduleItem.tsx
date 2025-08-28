import React from 'react';
import { format, parseISO } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { ScheduleEvent } from '@/types/schedule';
import { Clock, Edit, Trash2, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ScheduleItemComponentProps {
  event: ScheduleEvent;
  onEdit: (event: ScheduleEvent) => void;
  onDelete: (id: string) => void;
  isOverlay?: boolean;
  isScheduledTask?: boolean;
}

const ScheduleItem: React.FC<ScheduleItemComponentProps> = ({
  event,
  onEdit,
  onDelete,
  isOverlay,
  isScheduledTask,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging || isOverlay ? 100 : 1,
    opacity: isDragging ? 0.7 : 1,
  };

  const startTime = 'start_time' in event ? event.start_time : '';
  const endTime = 'end_time' in event ? event.end_time : '';
  const title = 'title' in event ? event.title : event.description || 'Untitled Task';
  const color = 'color' in event ? event.color : 'hsl(var(--primary))'; // Default color for tasks

  const formattedStartTime = startTime ? format(parseISO(`2000-01-01T${startTime}`), 'h:mm a') : '';
  const formattedEndTime = endTime ? format(parseISO(`2000-01-01T${endTime}`), 'h:mm a') : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "absolute left-0 right-0 rounded-lg p-2 text-white text-sm overflow-hidden shadow-md cursor-grab active:cursor-grabbing",
        "flex flex-col justify-between",
        isOverlay && "ring-2 ring-primary ring-offset-2",
        isScheduledTask ? "bg-gradient-to-br from-blue-500 to-blue-700" : "bg-gradient-to-br from-primary to-primary-foreground/80",
        "hover:shadow-lg transition-shadow duration-200 ease-in-out"
      )}
      style={{ backgroundColor: color }} // Override gradient with solid color if provided
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold truncate">{title}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-white/80 hover:text-white">
              <Edit className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(event)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(event.id)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-1 text-white/90">
        <Clock className="h-3 w-3" />
        <span>{formattedStartTime} - {formattedEndTime}</span>
      </div>
      {isScheduledTask && (
        <div className="flex items-center gap-1 text-white/90 mt-1">
          <ListTodo className="h-3 w-3" />
          <span>Task</span>
        </div>
      )}
    </div>
  );
};

export default ScheduleItem;