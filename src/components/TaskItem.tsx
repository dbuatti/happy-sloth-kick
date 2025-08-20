import React, { useState } from 'react';
import { format, parseISO, isValid, isToday, isTomorrow, addDays } from 'date-fns';
import { 
  MoreHorizontal, 
  Calendar, 
  Flag, 
  Paperclip, 
  Link as LinkIcon, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Archive,
  RotateCcw,
  ListTodo,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { useSound } from '@/context/SoundContext';

interface TaskItemProps {
  task: Task;
  sections: TaskSection[];
  allCategories: Category[];
  onUpdate: (id: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (task: Task) => void;
  playSound?: (sound: string) => void;
  showDetails?: boolean;
  onToggleDetails?: () => void;
  hasSubtasks?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  sections,
  allCategories,
  onUpdate,
  onDelete,
  onEdit,
  playSound,
  showDetails,
  onToggleDetails,
  hasSubtasks
}) => {
  const { playSound: playSoundContext } = useSound();
  const playSoundFn = playSound || playSoundContext;

  const handleStatusChange = async (newStatus: 'to-do' | 'completed') => {
    try {
      await onUpdate(task.id, { status: newStatus });
      if (newStatus === 'completed') {
        playSoundFn('success');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getPriorityColor = (priority: string | null) => {
    if (!priority) return 'border-l-gray-300';
    switch (priority) {
      case 'low': return 'border-l-green-500';
      case 'medium': return 'border-l-yellow-500';
      case 'high': return 'border-l-orange-500';
      case 'urgent': return 'border-l-red-500';
      default: return 'border-l-gray-300';
    }
  };

  const getPriorityDotColor = (priority: string | null) => {
    if (!priority) return 'bg-gray-400';
    switch (priority) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'urgent': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = parseISO(dateString);
    if (!isValid(date)) return null;
    
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return null;
    const date = parseISO(dateString);
    if (!isValid(date)) return null;
    return format(date, 'h:mm a');
  };

  const isOverdue = (dateString: string | null) => {
    if (!dateString) return false;
    const date = parseISO(dateString);
    return isValid(date) && date < new Date() && !isToday(date);
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'No Category';
    const category = allCategories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const getSectionName = (sectionId: string | null) => {
    if (!sectionId) return 'No Section';
    const section = sections.find(s => s.id === sectionId);
    return section ? section.name : 'Unknown Section';
  };

  const handleDelete = async () => {
    try {
      await onDelete(task.id);
      playSoundFn('delete');
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const formattedDate = formatDate(task.due_date);
  const formattedTime = formatTime(task.due_date);
  const isTaskOverdue = isOverdue(task.due_date);

  return (
    <div className={cn(
      "group relative rounded-xl p-3 transition-all duration-200 ease-in-out border border-transparent hover:shadow-md",
      task.status === 'completed' ? 'bg-muted/50' : 'bg-card',
      getPriorityColor(task.priority)
    )}>
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 mt-0.5 flex-shrink-0 rounded-full"
          onClick={() => handleStatusChange(task.status === 'completed' ? 'to-do' : 'completed')}
        >
          {task.status === 'completed' ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
        
        <div className="flex-grow min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-grow min-w-0">
              <p className={cn(
                "text-sm font-medium leading-tight",
                task.status === 'completed' && "line-through text-muted-foreground"
              )}>
                {task.description}
              </p>
              
              {task.notes && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {task.notes}
                </p>
              )}
              
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {formattedDate && (
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs py-0.5 px-1.5",
                      isTaskOverdue && task.status !== 'completed' && "bg-red-100 text-red-800"
                    )}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    {formattedDate}
                    {formattedTime && (
                      <span className="ml-1">
                        {formattedTime}
                      </span>
                    )}
                  </Badge>
                )}
                
                {task.priority && (
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs py-0.5 px-1.5 flex items-center gap-1",
                      task.priority === 'low' && "bg-green-100 text-green-800",
                      task.priority === 'medium' && "bg-yellow-100 text-yellow-800",
                      task.priority === 'high' && "bg-orange-100 text-orange-800",
                      task.priority === 'urgent' && "bg-red-100 text-red-800"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      getPriorityDotColor(task.priority)
                    )} />
                    {task.priority}
                  </Badge>
                )}
                
                {task.category && (
                  <Badge variant="secondary" className="text-xs py-0.5 px-1.5">
                    {getCategoryName(task.category)}
                  </Badge>
                )}
                
                {task.section_id && (
                  <Badge variant="secondary" className="text-xs py-0.5 px-1.5">
                    {getSectionName(task.section_id)}
                  </Badge>
                )}
                
                {task.link && (
                  <Badge variant="secondary" className="text-xs py-0.5 px-1.5">
                    <LinkIcon className="h-3 w-3 mr-1" />
                    Link
                  </Badge>
                )}
                
                {task.image_url && (
                  <Badge variant="secondary" className="text-xs py-0.5 px-1.5">
                    <Paperclip className="h-3 w-3 mr-1" />
                    Image
                  </Badge>
                )}
                
                {task.recurring_type !== 'none' && (
                  <Badge variant="secondary" className="text-xs py-0.5 px-1.5">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {task.recurring_type}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {hasSubtasks && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onToggleDetails}
                >
                  {showDetails ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => { onEdit(task); playSoundFn('click'); }}>
                    <ListTodo className="mr-2 h-4 w-4" /> Edit Task
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={async () => { 
                      await handleStatusChange(task.status === 'completed' ? 'to-do' : 'completed'); 
                      playSoundFn('success'); 
                    }}
                  >
                    {task.status === 'completed' ? (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4" /> Mark as To-Do
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Completed
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleDelete} className="text-destructive focus:text-destructive">
                    <Archive className="mr-2 h-4 w-4" /> Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;