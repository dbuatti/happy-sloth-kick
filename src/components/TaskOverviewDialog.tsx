import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, ListTodo, Edit, Calendar, StickyNote, BellRing, FolderOpen, Repeat, Link as LinkIcon, ClipboardCopy } from 'lucide-react';
import { Task, TaskSection, TaskCategory, UpdateTaskData, TaskOverviewDialogProps } from '@/types';
import { useSound } from '@/context/SoundContext';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { getCategoryColorProps, CategoryColorKey } from '@/lib/categoryColors';

const TaskOverviewDialog: React.FC<TaskOverviewDialogProps> = ({
  isOpen,
  onOpenChange,
  task,
  categories,
  sections,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
}) => {
  const { playSound } = useSound();
  const [isEditing, setIsEditing] = useState(false);

  const category = useMemo(() => categories.find(cat => cat.id === task.category?.id), [categories, task.category]);
  const section = useMemo(() => sections.find(sec => sec.id === task.section_id), [sections, task.section_id]);

  const isOverdue = useMemo(() => {
    if (task.due_date && task.status !== 'completed' && task.status !== 'archived') {
      const dueDate = parseISO(task.due_date);
      return isPast(dueDate) && !isToday(dueDate);
    }
    return false;
  }, [task.due_date, task.status]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleToggleComplete = async () => {
    playSound('complete');
    await onUpdateTask(task.id, { status: task.status === 'completed' ? 'to-do' : 'completed' });
    onOpenChange(false);
  };

  const handleArchive = async () => {
    if (window.confirm('Are you sure you want to archive this task?')) {
      await onUpdateTask(task.id, { status: 'archived' });
      onOpenChange(false);
      toast.success('Task archived!');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to permanently delete this task?')) {
      await onDeleteTask(task.id);
      onOpenChange(false);
      toast.success('Task deleted!');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{task.description}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline" className={cn(
              task.status === 'completed' && 'bg-green-100 text-green-800',
              task.status === 'archived' && 'bg-gray-100 text-gray-800',
              task.status === 'to-do' && 'bg-blue-100 text-blue-800'
            )}>
              <ListTodo className="mr-1 h-3 w-3" /> {task.status}
            </Badge>
            {task.priority && (
              <Badge variant="outline" className={cn(
                task.priority === 'urgent' && 'bg-red-100 text-red-800',
                task.priority === 'high' && 'bg-orange-100 text-orange-800',
                task.priority === 'medium' && 'bg-yellow-100 text-yellow-800',
                task.priority === 'low' && 'bg-green-100 text-green-800'
              )}>
                {task.priority}
              </Badge>
            )}
            {category && (
              <Badge variant="outline" style={{ backgroundColor: getCategoryColorProps(category.color as CategoryColorKey).backgroundClass, color: getCategoryColorProps(category.color as CategoryColorKey).textColor }}>
                {category.name}
              </Badge>
            )}
            {section && (
              <Badge variant="outline">
                <FolderOpen className="mr-1 h-3 w-3" /> {section.name}
              </Badge>
            )}
            {task.due_date && (
              <Badge variant="outline" className={cn(isOverdue && 'bg-red-100 text-red-800')}>
                <Calendar className="mr-1 h-3 w-3" /> Due: {format(parseISO(task.due_date), 'PPP')}
              </Badge>
            )}
            {task.recurring_type !== 'none' && (
              <Badge variant="outline">
                <Repeat className="mr-1 h-3 w-3" /> {task.recurring_type}
              </Badge>
            )}
          </div>

          {task.notes && (
            <div>
              <h3 className="font-semibold text-sm mb-1">Notes:</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}

          {task.link && (
            <div className="flex items-center text-sm text-blue-600 hover:underline">
              <LinkIcon className="mr-1 h-3 w-3" />
              <a href={task.link} target="_blank" rel="noopener noreferrer">{task.link}</a>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => handleCopy(task.link!)}>
                <ClipboardCopy className="h-3 w-3" />
              </Button>
            </div>
          )}

          {task.image_url && (
            <div>
              <h3 className="font-semibold text-sm mb-1">Image:</h3>
              <img src={task.image_url} alt="Task image" className="max-w-full h-auto rounded-md" />
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => handleCopy(task.image_url!)}>
                <ClipboardCopy className="h-3 w-3" />
              </Button>
            </div>
          )}

          {task.remind_at && (
            <div className="flex items-center text-sm text-muted-foreground">
              <BellRing className="mr-1 h-3 w-3" /> Remind at: {format(parseISO(task.remind_at), 'PPP p')}
            </div>
          )}

          {/* Subtasks could be rendered here if needed */}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="ghost" onClick={() => onUpdateTask(task.id, { status: task.status === 'completed' ? 'to-do' : 'completed' })}>
            {task.status === 'completed' ? 'Mark To-Do' : 'Mark Complete'}
          </Button>
          <Button variant="ghost" onClick={handleArchive}>Archive</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskOverviewDialog;