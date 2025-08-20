import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'; // Import DialogFooter
import { Button } from '@/components/ui/button';
import { Task, TaskSection, UpdateTaskData, Category } from '@/hooks/useTasks';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar, Clock, Tag, Info, ListTodo, CheckCircle2, Edit, Repeat } from 'lucide-react';
import { getPriorityColor } from '@/utils/taskHelpers';
import { getCategoryColorProps } from '@/utils/categoryHelpers';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TaskOverviewDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onEditClick: (task: Task) => void;
  onUpdate: (taskId: string, updates: UpdateTaskData) => Promise<Task | null>;
  onDelete: (taskId: string) => Promise<boolean>;
  sections: TaskSection[];
  allCategories: Category[];
  allTasks: Task[]; // For displaying subtasks
}

const TaskOverviewDialog: React.FC<TaskOverviewDialogProps> = ({
  task,
  isOpen,
  onClose,
  onEditClick,
  onUpdate,
  onDelete,
  sections,
  allCategories,
  allTasks,
}) => {
  const category = task.category ? allCategories.find(cat => cat.id === task.category) : undefined;
  const categoryColorProps = getCategoryColorProps(category?.color || ''); // Pass empty string if undefined

  const subtasks = allTasks.filter(t => t.parent_task_id === task.id);

  const handleStatusChange = async (newStatus: Task['status']) => {
    await onUpdate(task.id, { status: newStatus });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await onDelete(task.id);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task.status === 'completed' ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <ListTodo className="h-6 w-6 text-primary" />
            )}
            {task.description}
          </DialogTitle>
          <DialogDescription>
            Details for your task.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4 -mr-4"> {/* Added pr-4 and -mr-4 to offset scrollbar */}
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className={cn("h-3.5 w-3.5", getPriorityColor(task.priority || 'medium'))}><Edit className="h-3.5 w-3.5" /></span>
                <span>Priority: <span className={cn("font-semibold capitalize", getPriorityColor(task.priority || 'medium'))}>{task.priority || 'Medium'}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5" style={{ color: categoryColorProps.bgColor }} />
                <span>Category: <span className="font-semibold" style={{ color: categoryColorProps.textColor }}>{category?.name || 'None'}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <ListTodo className="h-3.5 w-3.5" />
                <span>Section: <span className="font-semibold">{task.section_id ? sections.find(s => s.id === task.section_id)?.name || 'Unknown Section' : 'No Section'}</span></span>
              </div>
              {task.recurring_type && task.recurring_type !== 'none' && (
                <div className="flex items-center gap-2">
                  <Repeat className="h-3.5 w-3.5" />
                  <span>Recurring: <span className="font-semibold capitalize">{task.recurring_type}</span></span>
                </div>
              )}
            </div>

            {task.due_date && isValid(parseISO(task.due_date)) && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                <span>Due Date: <span className="font-semibold">{format(parseISO(task.due_date), 'PPP')}</span></span>
              </div>
            )}

            {task.remind_at && isValid(parseISO(task.remind_at)) && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>Reminder: <span className="font-semibold">{format(parseISO(task.remind_at), 'PPP p')}</span></span>
              </div>
            )}

            {task.notes && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Notes:</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.notes}</p>
              </div>
            )}

            {task.link && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Link:</h4>
                <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm">
                  {task.link}
                </a>
              </div>
            )}

            {task.image_url && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Image:</h4>
                <img src={task.image_url} alt="Task related" className="max-w-full h-auto rounded-md" />
              </div>
            )}

            {subtasks.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Subtasks:</h4>
                <ul className="space-y-2">
                  {subtasks.map(subtask => (
                    <li key={subtask.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      {subtask.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <ListTodo className="h-4 w-4" />}
                      <span>{subtask.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-xs text-muted-foreground text-right">
              {task.created_at && <p>Created: {format(parseISO(task.created_at), 'MMM d, yyyy HH:mm')}</p>}
              {task.updated_at && <p>Last Updated: {format(parseISO(task.updated_at), 'MMM d, yyyy HH:mm')}</p>}
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2 mt-4">
          <div className="flex gap-2">
            {task.status !== 'completed' && task.status !== 'archived' && task.status !== 'skipped' && (
              <Button variant="outline" onClick={() => handleStatusChange('completed')}>Mark Complete</Button>
            )}
            {task.status === 'completed' && (
              <Button variant="outline" onClick={() => handleStatusChange('to-do')}>Mark To-Do</Button>
            )}
            {task.status !== 'archived' && (
              <Button variant="outline" onClick={() => handleStatusChange('archived')}>Archive</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onEditClick(task)}>Edit</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskOverviewDialog;