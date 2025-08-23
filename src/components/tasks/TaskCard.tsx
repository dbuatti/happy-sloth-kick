import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Edit, Trash2, CheckCircle2, Archive, Repeat, Link as LinkIcon, ClipboardCopy, X, Eye, EyeOff, BellRing, StickyNote, FolderOpen } from 'lucide-react';
import { format, isSameDay, parseISO, isToday } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Task, TaskCategory, TaskSection, NewTaskData, UpdateTaskData, DoTodayOffLogEntry } from '@/types'; // Corrected imports
import { useTasks } from '@/hooks/useTasks';
import { useTaskSections } from '@/hooks/useTaskSections';
import { useTaskCategories } from '@/hooks/useTaskCategories';
import { useDoTodayOffLog } from '@/hooks/useDoTodayOffLog';
import { toast } from 'react-hot-toast';
import { useSound } from '@/context/SoundContext';
import TaskOverviewDialog from '../TaskOverviewDialog';

interface TaskCardProps {
  task: Task;
  categories: TaskCategory[];
  sections: TaskSection[];
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<void>;
  onToggleFocusMode: (taskId: string) => void;
  onLogDoTodayOff: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
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
  const { categories: allCategories } = useTaskCategories(); // Renamed to avoid conflict
  const { sections: allSections } = useTaskSections(); // Renamed to avoid conflict
  const { offLogEntries: doTodayOffLog, addDoTodayOffLogEntry, deleteDoTodayOffLogEntry } = useDoTodayOffLog();

  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(task.description);
  const [editedNotes, setEditedNotes] = useState(task.notes || '');
  const [editedDueDate, setEditedDueDate] = useState<Date | undefined>(task.due_date ? new Date(task.due_date) : undefined);
  const [editedCategory, setEditedCategory] = useState<string | null>(task.category || null);
  const [editedPriority, setEditedPriority] = useState<Task['priority']>(task.priority || 'medium');
  const [editedSectionId, setEditedSectionId] = useState<string | null>(task.section_id || null);
  const [editedRecurringType, setEditedRecurringType] = useState<Task['recurring_type']>(task.recurring_type || 'none');
  const [editedLink, setEditedLink] = useState(task.link || '');
  const [editedImageUrl, setEditedImageUrl] = useState(task.image_url || '');

  const [isOverviewDialogOpen, setIsOverviewDialogOpen] = useState(false);

  const currentCategory = useMemo(() => {
    return categories.find(cat => cat.id === task.category);
  }, [categories, task.category]);

  const currentSection = useMemo(() => {
    return sections.find(sec => sec.id === task.section_id);
  }, [sections, task.section_id]);

  const isOverdue = useMemo(() => {
    if (!task.due_date || task.status === 'completed') return false;
    const dueDate = new Date(task.due_date);
    return isPast(dueDate) && !isSameDay(dueDate, new Date());
  }, [task.due_date, task.status]);

  const isTaskOffToday = useMemo(() => {
    return doTodayOffLog?.some(
      (entry: DoTodayOffLogEntry) => entry.task_id === task.id && isToday(parseISO(entry.off_date))
    );
  }, [doTodayOffLog, task.id]);

  const handleSave = async () => {
    if (!editedDescription.trim()) {
      toast.error('Description cannot be empty.');
      return;
    }
    try {
      const updates: UpdateTaskData = {
        description: editedDescription.trim(),
        notes: editedNotes.trim() || null,
        due_date: editedDueDate ? format(editedDueDate, 'yyyy-MM-dd HH:mm:ss') : null,
        category: editedCategory,
        priority: editedPriority,
        section_id: editedSectionId,
        recurring_type: editedRecurringType,
        link: editedLink.trim() || null,
        image_url: editedImageUrl.trim() || null,
      };
      await onUpdateTask(task.id, updates);
      setIsEditing(false);
      toast.success('Task updated!');
    } catch (error) {
      toast.error(`Failed to update task: ${(error as Error).message}`);
      console.error('Error updating task:', error);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = task.status === 'completed' ? 'to-do' : 'completed';
    try {
      await onUpdateTask(task.id, { status: newStatus });
      if (newStatus === 'completed') {
        playSound('complete');
        toast.success('Task completed!');
      } else {
        toast('Task marked as to-do.');
      }
    } catch (error) {
      toast.error(`Failed to update task status: ${(error as Error).message}`);
      console.error('Error updating task status:', error);
    }
  };

  const handleArchive = async () => {
    if (window.confirm('Are you sure you want to archive this task?')) {
      try {
        await onUpdateTask(task.id, { status: 'archived' });
        toast.success('Task archived!');
      } catch (error) {
        toast.error(`Failed to archive task: ${(error as Error).message}`);
        console.error('Error archiving task:', error);
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task and all its subtasks? This action cannot be undone.')) {
      try {
        await onDeleteTask(task.id);
        toast.success('Task deleted!');
      } catch (error) {
        toast.error(`Failed to delete task: ${(error as Error).message}`);
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleToggleDoTodayOff = async () => {
    if (isTaskOffToday) {
      const entry = doTodayOffLog?.find(
        (entry: DoTodayOffLogEntry) => entry.task_id === task.id && isToday(parseISO(entry.off_date))
      );
      if (entry) {
        await deleteDoTodayOffLogEntry(entry.id);
        toast('Task is now "Do Today On"!');
      }
    } else {
      await addDoTodayOffLogEntry({ task_id: task.id, off_date: format(new Date(), 'yyyy-MM-dd') });
      toast('Task is now "Do Today Off"!');
    }
  };

  return (
    <Card className={cn(
      "relative group",
      task.status === 'completed' && 'opacity-70 line-through',
      isOverdue && 'border-red-500',
      isTaskOffToday && 'bg-gray-100 dark:bg-gray-800'
    )}>
      <CardContent className="p-4 flex items-center space-x-3">
        <input
          type="checkbox"
          checked={task.status === 'completed'}
          onChange={handleToggleStatus}
          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        {isEditing ? (
          <div className="flex-1 space-y-2">
            <Input
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              className="font-medium"
            />
            <Textarea
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              onBlur={handleSave}
              placeholder="Add notes..."
              className="text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !editedDueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editedDueDate ? format(editedDueDate, "PPP") : <span>Due Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editedDueDate}
                    onSelect={(date) => { setEditedDueDate(date); handleSave(); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Select value={editedCategory || ''} onValueChange={(value) => { setEditedCategory(value || null); handleSave(); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Category</SelectItem>
                  {allCategories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={editedPriority} onValueChange={(value) => { setEditedPriority(value as Task['priority']); handleSave(); }}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Select value={editedSectionId || ''} onValueChange={(value) => { setEditedSectionId(value || null); handleSave(); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Section</SelectItem>
                  {allSections?.map((section: TaskSection) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={editedRecurringType} onValueChange={(value) => { setEditedRecurringType(value as Task['recurring_type']); handleSave(); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Recurring" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={editedLink}
                onChange={(e) => setEditedLink(e.target.value)}
                onBlur={handleSave}
                placeholder="Add link..."
                className="w-[200px]"
              />
              <Input
                value={editedImageUrl}
                onChange={(e) => setEditedImageUrl(e.target.value)}
                onBlur={handleSave}
                placeholder="Add image URL..."
                className="w-[200px]"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <p className="font-medium text-sm">{task.description}</p>
            <div className="flex flex-wrap items-center gap-x-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
              {currentCategory && (
                <span className={`px-2 py-0.5 rounded-full text-white ${currentCategory.color ? `bg-${currentCategory.color}-500` : 'bg-gray-500'}`}>
                  {currentCategory.name}
                </span>
              )}
              {task.priority && task.priority !== 'none' && (
                <span className="capitalize">{task.priority} Priority</span>
              )}
              {task.due_date && (
                <span className={cn(isOverdue && 'text-red-500 font-semibold')}>
                  Due {format(new Date(task.due_date), 'MMM d, p')}
                </span>
              )}
              {currentSection && (
                <span>Section: {currentSection.name}</span>
              )}
              {task.recurring_type && task.recurring_type !== 'none' && (
                <span className="capitalize">Repeats {task.recurring_type}</span>
              )}
              {task.link && (
                <a href={task.link} target="_blank" rel="noopener noreferrer" className="flex items-center hover:underline">
                  <LinkIcon className="h-3 w-3 mr-1" /> Link
                </a>
              )}
              {task.image_url && (
                <span className="flex items-center">
                  <ImageIcon className="h-3 w-3 mr-1" /> Image
                </span>
              )}
            </div>
            {task.notes && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{task.notes}</p>}
          </div>
        )}

        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsOverviewDialogOpen(true)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleArchive}>
            <Archive className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </CardContent>

      <TaskOverviewDialog
        isOpen={isOverviewDialogOpen}
        onOpenChange={setIsOverviewDialogOpen}
        task={task}
        categories={categories}
        sections={sections}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onAddSubtask={onAddSubtask}
        onToggleFocusMode={onToggleFocusMode}
        onLogDoTodayOff={onLogDoTodayOff}
      />
    </Card>
  );
};

export default TaskCard;