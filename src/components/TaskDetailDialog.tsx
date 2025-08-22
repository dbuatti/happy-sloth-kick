"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, ListTodo } from 'lucide-react';
import { Task, TaskSection, TaskCategory } from '@/types'; // Import types from @/types
import { useTasks } from '@/hooks/useTasks'; // Keep useTasks for subtask updates and handleAddTask
import TaskItem from './TaskItem'; // Import TaskItem for rendering subtasks
import { useAuth } from '@/context/AuthContext';

interface TaskDetailDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  task: Task | null;
  allTasks: Task[]; // Pass all tasks for subtask filtering
  sections: TaskSection[];
  categories: TaskCategory[];
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  onDelete: (taskId: string) => Promise<void>;
  onAddTask: (newTask: Partial<Task>) => Promise<Task | null>; // For adding subtasks
}

export const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  isOpen,
  setIsOpen,
  task,
  allTasks,
  sections,
  categories,
  onUpdate,
  onDelete,
  onAddTask,
}) => {
  const { user } = useAuth();
  const userId = user?.id;

  const [description, setDescription] = useState(task?.description || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'medium');
  const [category, setCategory] = useState(task?.category || '');
  const [sectionId, setSectionId] = useState(task?.section_id || '');
  const [dueDate, setDueDate] = useState(task?.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '');
  const [status, setStatus] = useState<Task['status']>(task?.status || 'to-do');
  const [newSubtaskDescription, setNewSubtaskDescription] = useState('');

  useEffect(() => {
    if (task) {
      setDescription(task.description || '');
      setNotes(task.notes || '');
      setPriority(task.priority || 'medium');
      setCategory(task.category || '');
      setSectionId(task.section_id || '');
      setDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '');
      setStatus(task.status || 'to-do');
    } else {
      setDescription('');
      setNotes('');
      setPriority('medium');
      setCategory('');
      setSectionId('');
      setDueDate('');
      setStatus('to-do');
    }
    setNewSubtaskDescription('');
  }, [task]);

  const handleSubmit = async () => {
    if (!task) return;
    const taskData: Partial<Task> = {
      description: description.trim() || null,
      notes: notes.trim() || null,
      priority: priority,
      category: category || null,
      section_id: sectionId || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      status: status,
    };
    await onUpdate(task.id, taskData);
    setIsOpen(false);
  };

  const handleAddSubtask = async () => {
    if (!task || !newSubtaskDescription.trim()) return;
    await onAddTask({
      description: newSubtaskDescription.trim(),
      parent_task_id: task.id,
      section_id: task.section_id, // Inherit section from parent
      status: 'to-do',
      user_id: userId || '',
    });
    setNewSubtaskDescription('');
  };

  const subtasks = allTasks.filter(sub => sub.parent_task_id === task?.id);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task Details' : 'Add New Task'}</DialogTitle>
        </DialogHeader>
        {task && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">
                Priority
              </Label>
              <Select value={priority || ''} onValueChange={(value) => setPriority(value as Task['priority'])}>
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
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Select value={category || ''} onValueChange={setCategory}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="section" className="text-right">
                Section
              </Label>
              <Select value={sectionId || ''} onValueChange={setSectionId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id}>
                      {sec.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select value={status || ''} onValueChange={(value) => setStatus(value as Task['status'])}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to-do">To-Do</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-4 mt-4">
              <h3 className="text-lg font-semibold mb-2">Subtasks</h3>
              <div className="space-y-2">
                {subtasks.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No subtasks yet.</p>
                ) : (
                  subtasks.map(subtask => (
                    <TaskItem
                      key={subtask.id}
                      task={subtask}
                      categories={categories}
                      onEdit={(t) => {
                        setIsOpen(false); // Close current dialog
                        // You might want to open another TaskDetailDialog for the subtask
                        // For now, just log or handle differently
                        console.log("Edit subtask:", t);
                      }}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                      isSubtask={true}
                    />
                  ))
                )}
              </div>
              <div className="flex items-center space-x-2 mt-4">
                <Input
                  placeholder="Add a new subtask..."
                  value={newSubtaskDescription}
                  onChange={(e) => setNewSubtaskDescription(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                />
                <Button onClick={handleAddSubtask} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};