"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, ListTodo, Edit, Calendar, StickyNote, BellRing, FolderOpen, Repeat, Link as LinkIcon, ClipboardCopy, Flag } from 'lucide-react'; // Imported Flag
import { Task, TaskSection, TaskCategory } from '@/types/task'; // Corrected import
import { useSound } from '@/context/SoundContext';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { getCategoryColorProps } from '@/lib/categoryColors';
import TaskDetailDialog from './TaskDetailDialog';
import { showError, showSuccess } from '@/utils/toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import TaskItem from './TaskItem';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks'; // Import useTasks for subtask management

interface TaskOverviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  allTasks: Task[]; // All tasks for subtask management
  sections: TaskSection[];
  categories: TaskCategory[];
  onToggleDoToday?: (taskId: string, date: Date) => void;
  isDoTodayOff?: boolean;
}

const TaskOverviewDialog: React.FC<TaskOverviewDialogProps> = ({
  isOpen,
  onClose,
  task,
  onUpdateTask,
  onDeleteTask,
  allTasks,
  sections,
  categories,
  onToggleDoToday,
  isDoTodayOff,
}) => {
  const { playSound } = useSound();
  const { user } = useAuth();
  const { handleAddTask: addSubtask, handleUpdateTask: updateSubtask, handleDeleteTask: deleteSubtask } = useTasks({ currentDate: new Date(), userId: user?.id });

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const subtasks = allTasks.filter(sub => sub.parent_task_id === task.id);

  const handleCheckboxChange = (checked: boolean) => {
    const newStatus = checked ? 'completed' : 'to-do';
    onUpdateTask(task.id, { status: newStatus });
    if (checked) {
      playSound('complete');
    }
    onClose(); // Close overview after completing task
  };

  const handleOpenEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleCloseEdit = () => {
    setIsEditDialogOpen(false);
    onClose(); // Close overview after editing
  };

  const handleConfirmDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await onDeleteTask(task.id);
      showSuccess("Task deleted successfully!");
      onClose();
    } catch (error) {
      showError("Failed to delete task.");
      console.error("Failed to delete task:", error);
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const getDueDateClasses = () => {
    if (!task.due_date) return "";
    const dueDate = parseISO(task.due_date);
    if (isPast(dueDate) && !isToday(dueDate) && task.status !== 'completed') {
      return "text-destructive font-medium";
    }
    if (isToday(dueDate) && task.status !== 'completed') {
      return "text-orange-500 font-medium";
    }
    if (isTomorrow(dueDate) && task.status !== 'completed') {
      return "text-yellow-500";
    }
    return "text-muted-foreground";
  };

  const getPriorityClasses = () => {
    switch (task.priority) {
      case 'urgent': return "text-red-600 font-bold";
      case 'high': return "text-orange-500 font-medium";
      case 'medium': return "text-yellow-500";
      case 'low': return "text-green-500";
      default: return "text-muted-foreground";
    }
  };

  const category = categories.find(cat => cat.id === task.category);
  const categoryProps = category ? getCategoryColorProps(category.color) : null;
  const section = sections.find(sec => sec.id === task.section_id);

  const handleCopyLink = () => {
    if (task.link) {
      navigator.clipboard.writeText(task.link);
      showSuccess("Link copied to clipboard!");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className={cn(task.status === 'completed' ? "line-through text-muted-foreground" : "")}>
                {task.description}
              </span>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" onClick={handleOpenEdit}>
                  <Edit className="h-5 w-5" />
                </Button>
                <Button variant="destructive" size="icon" onClick={handleConfirmDelete}>
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
              Task details and actions.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {task.notes && (
              <div className="flex items-start gap-2">
                <StickyNote className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                <p className="text-sm text-foreground">{task.notes}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {task.due_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className={cn("text-sm", getDueDateClasses())}>
                    Due: {format(parseISO(task.due_date), 'PPP')}
                  </span>
                </div>
              )}
              {task.priority && task.priority !== 'none' && (
                <div className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-muted-foreground" />
                  <span className={cn("text-sm", getPriorityClasses())}>
                    Priority: {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </span>
                </div>
              )}
              {section && (
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">Section: {section.name}</span>
                </div>
              )}
              {category && (
                <div className="flex items-center gap-2">
                  <span className={cn("w-4 h-4 rounded-full", categoryProps?.dotColor)}></span>
                  <span className="text-sm">Category: {category.name}</span>
                </div>
              )}
              {task.recurring_type && task.recurring_type !== 'none' && (
                <div className="flex items-center gap-2">
                  <Repeat className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">Recurring: {task.recurring_type.charAt(0).toUpperCase() + task.recurring_type.slice(1)}</span>
                </div>
              )}
              {task.remind_at && (
                <div className="flex items-center gap-2">
                  <BellRing className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">Remind: {format(parseISO(task.remind_at), 'PPP p')}</span>
                </div>
              )}
              {task.link && (
                <div className="flex items-center gap-2 col-span-2">
                  <LinkIcon className="h-5 w-5 text-muted-foreground" />
                  <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate">
                    {task.link}
                  </a>
                  <Button variant="ghost" size="icon" onClick={handleCopyLink} className="h-6 w-6">
                    <ClipboardCopy className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {task.image_url && (
                <div className="col-span-2">
                  <img src={task.image_url} alt="Task related" className="max-w-full h-auto rounded-md mt-2" />
                </div>
              )}
            </div>

            <div className="mt-4 border-t pt-4">
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <ListTodo className="h-5 w-5 mr-2" /> Subtasks ({subtasks.length})
              </h3>
              <div className="space-y-2">
                {subtasks.map(subtask => (
                  <TaskItem
                    key={subtask.id}
                    task={subtask}
                    onUpdateTask={updateSubtask}
                    onDeleteTask={deleteSubtask}
                    allTasks={allTasks}
                    sections={sections}
                    categories={categories}
                    isSubtask={true}
                    showSection={false}
                    showCategory={false}
                    showDueDate={true}
                    showPriority={true}
                    showNotes={false}
                    showLink={false}
                    showImage={false}
                    showRecurring={false}
                    showSubtasks={false}
                    showDoTodayToggle={onToggleDoToday !== undefined}
                    onToggleDoToday={onToggleDoToday}
                    isDoTodayOff={isDoTodayOff}
                  />
                ))}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Add a new subtask..."
                    className="flex-1 px-3 py-2 border rounded-md text-sm"
                    onKeyPress={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (e.currentTarget.value.trim()) {
                          await addSubtask({
                            description: e.currentTarget.value.trim(),
                            parent_task_id: task.id,
                            section_id: task.section_id,
                            priority: task.priority,
                            category: task.category,
                          });
                          showSuccess("Subtask added!");
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                  <Button onClick={async () => { /* Handled by input onKeyPress */ }} disabled={true}>Add</Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            {onToggleDoToday && (
              <Button
                variant={isDoTodayOff ? "secondary" : "outline"}
                onClick={() => onToggleDoToday(task.id, new Date())}
                className="mr-auto"
              >
                {isDoTodayOff ? "Do Today" : "Skip Today"}
              </Button>
            )}
            <Button
              onClick={() => handleCheckboxChange(task.status !== 'completed')}
              variant={task.status === 'completed' ? "secondary" : "default"}
            >
              {task.status === 'completed' ? "Mark as To-Do" : "Mark Completed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDetailDialog
        isOpen={isEditDialogOpen}
        onClose={handleCloseEdit}
        task={task}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        allTasks={allTasks}
        sections={sections}
        categories={categories}
        onToggleDoToday={onToggleDoToday}
        isDoTodayOff={isDoTodayOff}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your task "{task.description}" and all its subtasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskOverviewDialog;