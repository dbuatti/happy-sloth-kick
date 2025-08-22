"use client";

import React, { useState } from 'react'; // Removed unused useEffect
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, ListTodo } from 'lucide-react';
import { Task, TaskSection, TaskCategory } from '@/types/task'; // Corrected import
import { useTasks } from '@/hooks/useTasks';
import TaskForm from './TaskForm';
import { showError, showSuccess } from '@/utils/toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import TaskItem from './TaskItem';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input'; // Imported Input

interface TaskDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  allTasks: Task[]; // All tasks for subtask management
  sections: TaskSection[];
  categories: TaskCategory[];
  onToggleDoToday?: (taskId: string, date: Date) => void;
  isDoTodayOff?: boolean;
}

const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
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
  const { user } = useAuth();
  const { handleAddTask: addSubtask, handleUpdateTask: updateSubtask, handleDeleteTask: deleteSubtask } = useTasks({ currentDate: new Date(), userId: user?.id });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const subtasks = allTasks.filter(sub => sub.parent_task_id === task?.id);

  const handleFormSubmit = async (data: Partial<Task>) => {
    if (!task) return;
    setIsSubmitting(true);
    try {
      await onUpdateTask(task.id, data);
      showSuccess("Task updated successfully!");
      onClose();
    } catch (error) {
      showError("Failed to update task.");
      console.error("Failed to update task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!task) return;
    setIsSubmitting(true);
    try {
      await onDeleteTask(task.id);
      showSuccess("Task deleted successfully!");
      onClose();
    } catch (error) {
      showError("Failed to delete task.");
      console.error("Failed to delete task:", error);
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleAddSubtask = async (description: string) => {
    if (!task || !description.trim()) return;
    await addSubtask({
      description: description.trim(),
      parent_task_id: task.id,
      section_id: task.section_id,
      priority: task.priority,
      category: task.category,
    });
    showSuccess("Subtask added!");
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Make changes to your task here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <TaskForm
          task={task}
          sections={sections}
          categories={categories}
          onSubmit={handleFormSubmit}
          onCancel={onClose}
          isSubmitting={isSubmitting}
        />

        <div className="mt-6 border-t pt-4">
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
              <Input
                placeholder="Add a new subtask..."
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => { // Explicitly typed 'e'
                  if (e.key === 'Enter') {
                    handleAddSubtask(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <Button onClick={() => handleAddSubtask('')} disabled={true}>Add</Button> {/* Disabled as input handles enter */}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSubmitting}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete Task
          </Button>
        </DialogFooter>
      </DialogContent>

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
    </Dialog>
  );
};

export default TaskDetailDialog;