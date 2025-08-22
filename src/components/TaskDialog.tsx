"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Task, TaskCategory, TaskSection } from '@/types';

interface TaskDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  task: Task | null;
  categories: TaskCategory[];
  sections: TaskSection[];
  onSave: (taskData: Partial<Task>) => Promise<void>;
}

export const TaskDialog: React.FC<TaskDialogProps> = ({ isOpen, setIsOpen, task, categories, sections, onSave }) => {
  const [description, setDescription] = useState(task?.description || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'medium');
  const [category, setCategory] = useState(task?.category || '');
  const [sectionId, setSectionId] = useState(task?.section_id || '');
  const [dueDate, setDueDate] = useState(task?.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '');

  useEffect(() => {
    if (task) {
      setDescription(task.description || '');
      setNotes(task.notes || '');
      setPriority(task.priority || 'medium');
      setCategory(task.category || '');
      setSectionId(task.section_id || '');
      setDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '');
    } else {
      setDescription('');
      setNotes('');
      setPriority('medium');
      setCategory('');
      setSectionId('');
      setDueDate('');
    }
  }, [task]);

  const handleSubmit = async () => {
    const taskData: Partial<Task> = {
      description: description.trim() || null,
      notes: notes.trim() || null,
      priority: priority,
      category: category || null,
      section_id: sectionId || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    };
    await onSave(taskData);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Add New Task'}</DialogTitle>
        </DialogHeader>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};