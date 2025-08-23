import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, ListTodo, Edit, Calendar, StickyNote, BellRing, FolderOpen, Repeat, Link as LinkIcon, ClipboardCopy } from 'lucide-react';
import { Task, TaskSection, TaskCategory, UpdateTaskData, TaskOverviewDialogProps } from '@/types';
import { useSound } from '@/context/SoundContext';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { getCategoryColorProps, CategoryColorKey } from '@/lib/categoryColors';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as DatePicker } from '@/components/ui/calendar';
import { toast } from 'react-hot-toast';

const TaskOverviewDialog: React.FC<TaskOverviewDialogProps> = ({
  task,
  isOpen,
  onOpenChange,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
  categories,
  sections,
}) => {
  const { playSound } = useSound();
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(task.description);
  const [editedNotes, setEditedNotes] = useState(task.notes || '');
  const [editedDueDate, setEditedDueDate] = useState<Date | null>(task.due_date ? parseISO(task.due_date) : null);
  const [editedCategory, setEditedCategory] = useState(task.category || null);
  const [editedSection, setEditedSection] = useState(task.section_id || null);
  const [editedPriority, setEditedPriority] = useState(task.priority || 'medium');
  const [editedLink, setEditedLink] = useState(task.link || '');
  const [editedImageUrl, setEditedImageUrl] = useState(task.image_url || '');

  const category = useMemo(() => categories.find((cat: TaskCategory) => cat.id === editedCategory), [categories, editedCategory]);
  const section = useMemo(() => sections.find((sec: TaskSection) => sec.id === editedSection), [sections, editedSection]);

  const handleToggleComplete = async () => {
    playSound('complete');
    await onUpdateTask(task.id, { status: task.status === 'completed' ? 'to-do' : 'completed' });
    onOpenChange(false);
  };

  const handleSave = async () => {
    const updates: UpdateTaskData = {
      description: editedDescription,
      notes: editedNotes,
      due_date: editedDueDate ? editedDueDate.toISOString() : null,
      category: editedCategory,
      section_id: editedSection,
      priority: editedPriority,
      link: editedLink,
      image_url: editedImageUrl,
    };
    try {
      await onUpdateTask(task.id, updates);
      setIsEditing(false);
      toast.success('Task details updated!');
    } catch (error) {
      toast.error('Failed to update task details.');
      console.error('Error updating task details:', error);
    }
  };

  const categoryProps = category ? getCategoryColorProps(category.color as CategoryColorKey) : { backgroundClass: 'bg-gray-100', textColor: 'text-gray-800' };

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
  const isDueToday = task.due_date && isToday(parseISO(task.due_date));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {isEditing ? (
              <Input value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} className="text-xl font-bold" />
            ) : (
              <span className="text-xl font-bold">{task.description}</span>
            )}
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <Button variant="ghost" size="sm" onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" /> Save
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onDeleteTask(task.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <ListTodo className="h-4 w-4" />
            <span>Status: <Badge variant="secondary">{task.status}</Badge></span>
            {category && (
              <Badge variant="outline" style={{ backgroundColor: categoryProps.backgroundClass, color: categoryProps.textColor }}>
                {category.name}
              </Badge>
            )}
            {section && (
              <Badge variant="outline">{section.name}</Badge>
            )}
          </div>

          {isEditing ? (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">Priority</Label>
                <Select value={editedPriority || ''} onValueChange={(value) => setEditedPriority(value as Task['priority'])}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dueDate" className="text-right">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !editedDueDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {editedDueDate ? format(editedDueDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <DatePicker
                      mode="single"
                      selected={editedDueDate || undefined}
                      onSelect={setEditedDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">Category</Label>
                <Select value={editedCategory || ''} onValueChange={(value) => setEditedCategory(value)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Category</SelectItem>
                    {categories.map((cat: TaskCategory) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="section" className="text-right">Section</Label>
                <Select value={editedSection || ''} onValueChange={(value) => setEditedSection(value)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Section</SelectItem>
                    {sections.map((sec: TaskSection) => (
                      <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="link" className="text-right">Link</Label>
                <Input id="link" value={editedLink} onChange={(e) => setEditedLink(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="imageUrl" className="text-right">Image URL</Label>
                <Input id="imageUrl" value={editedImageUrl} onChange={(e) => setEditedImageUrl(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right">Notes</Label>
                <Textarea id="notes" value={editedNotes} onChange={(e) => setEditedNotes(e.target.value)} className="col-span-3 min-h-[100px]" />
              </div>
            </>
          ) : (
            <>
              {task.due_date && (
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span className={cn(isOverdue ? 'text-red-500' : isDueToday ? 'text-orange-500' : 'text-muted-foreground')}>
                    {isOverdue ? 'Overdue' : isDueToday ? 'Due Today' : 'Due'} {format(parseISO(task.due_date), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              {task.notes && (
                <div className="flex items-start space-x-2 text-sm text-muted-foreground">
                  <StickyNote className="h-4 w-4 mt-1" />
                  <p className="flex-1">{task.notes}</p>
                </div>
              )}
              {task.link && (
                <div className="flex items-center space-x-2 text-sm text-blue-500 hover:underline">
                  <LinkIcon className="h-4 w-4" />
                  <a href={task.link} target="_blank" rel="noopener noreferrer">{task.link}</a>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigator.clipboard.writeText(task.link || '')}>
                    <ClipboardCopy className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {task.image_url && (
                <div className="flex items-center space-x-2 text-sm">
                  <img src={task.image_url} alt="Task image" className="max-h-32 rounded-md" />
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          {!isEditing && (
            <Button onClick={handleToggleComplete}>
              {task.status === 'completed' ? 'Mark as To-Do' : 'Mark Completed'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskOverviewDialog;