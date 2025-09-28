"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Sparkles } from "lucide-react";
import { format, parseISO, isValid, startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { showLoading, dismissToast, showError, showSuccess } from '@/utils/toast'; // Import toast utilities
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

interface TaskFormProps {
  onSave: (taskData: NewTaskData) => Promise<string | null>;
  onCancel: () => void;
  initialData?: Partial<Task>;
  sections: TaskSection[];
  allCategories: Category[];
  preselectedSectionId?: string;
  currentDate: Date;
  autoFocus?: boolean;
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  allTasks: Task[]; // For subtask parent selection
}

const TaskForm: React.FC<TaskFormProps> = ({
  onSave,
  onCancel,
  initialData,
  sections,
  allCategories,
  preselectedSectionId,
  currentDate,
  autoFocus = false,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  allTasks,
}) => {
  const [description, setDescription] = useState(initialData?.description || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [category, setCategory] = useState(initialData?.category || allCategories[0]?.id || '');
  const [priority, setPriority] = useState(initialData?.priority || 'medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(initialData?.due_date ? parseISO(initialData.due_date) : undefined);
  const [remindAt, setRemindAt] = useState<Date | undefined>(initialData?.remind_at ? parseISO(initialData.remind_at) : undefined);
  const [sectionId, setSectionId] = useState<string | null>(initialData?.section_id || preselectedSectionId || null);
  const [parentTaskId, setParentTaskId] = useState<string | null>(initialData?.parent_task_id || null);
  const [link, setLink] = useState(initialData?.link || '');
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false); // New state for AI suggestions
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]); // New state for AI suggestions
  const descriptionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && descriptionRef.current) {
      descriptionRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showError('Task description cannot be empty.');
      return;
    }

    setIsSaving(true);
    const newTaskData: NewTaskData = {
      description: description.trim(),
      notes: notes.trim() || null,
      category: category || null,
      priority,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      remind_at: remindAt ? remindAt.toISOString() : null,
      section_id: sectionId,
      parent_task_id: parentTaskId,
      link: link.trim() || null,
      image_url: imageUrl.trim() || null,
    };

    const success = await onSave(newTaskData);
    if (success) {
      // Optionally clear form or close dialog handled by parent
    }
    setIsSaving(false);
  };

  const handleGenerateSuggestions = async () => {
    if (!description.trim()) {
      showError('Please enter a partial description to get AI suggestions.');
      return;
    }

    setIsGeneratingSuggestions(true);
    const toastId = showLoading('Getting AI suggestions...');

    try {
      const { data, error } = await supabase.functions.invoke('generate-task-suggestions', {
        body: { partialDescription: description.trim() },
      });

      if (error) throw error;

      setAiSuggestions(data.suggestions || []);
      showSuccess('AI suggestions generated!');
    } catch (error: any) {
      console.error('Error generating AI suggestions:', error.message);
      showError('Failed to get AI suggestions.');
    } finally {
      dismissToast(toastId);
      setIsGeneratingSuggestions(false);
    }
  };

  const handleApplySuggestion = (suggestion: string) => {
    setDescription(suggestion);
    setAiSuggestions([]); // Clear suggestions after applying one
  };

  const topLevelTasks = useMemo(() => {
    return allTasks.filter(task => task.parent_task_id === null && task.id !== initialData?.id);
  }, [allTasks, initialData?.id]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Task Description</Label>
        <div className="flex gap-2">
          <Input
            id="description"
            ref={descriptionRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Finish project report"
            disabled={isSaving}
            className="flex-grow"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleGenerateSuggestions}
            disabled={isGeneratingSuggestions || isSaving || !description.trim()}
            aria-label="Get AI Suggestions"
          >
            {isGeneratingSuggestions ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </div>
        {aiSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {aiSuggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="secondary"
                size="sm"
                onClick={() => handleApplySuggestion(suggestion)}
                disabled={isSaving}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any additional notes or details"
          disabled={isSaving}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory} disabled={isSaving}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {allCategories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select value={priority} onValueChange={setPriority} disabled={isSaving}>
            <SelectTrigger id="priority">
              <SelectValue placeholder="Select a priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="due-date">Due Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dueDate && "text-muted-foreground"
                )}
                disabled={isSaving}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="remind-at">Remind At</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !remindAt && "text-muted-foreground"
                )}
                disabled={isSaving}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {remindAt ? format(remindAt, "PPP HH:mm") : <span>Set reminder time</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={remindAt}
                onSelect={(date) => {
                  if (date) {
                    const newRemindAt = date;
                    if (remindAt) {
                      newRemindAt.setHours(remindAt.getHours());
                      newRemindAt.setMinutes(remindAt.getMinutes());
                    } else {
                      // Default to current time if no previous remindAt
                      const now = new Date();
                      newRemindAt.setHours(now.getHours());
                      newRemindAt.setMinutes(now.getMinutes());
                    }
                    setRemindAt(newRemindAt);
                  } else {
                    setRemindAt(undefined);
                  }
                }}
                initialFocus
              />
              <div className="p-3 border-t border-border">
                <Input
                  type="time"
                  value={remindAt ? format(remindAt, 'HH:mm') : ''}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':').map(Number);
                    if (remindAt) {
                      const newRemindAt = new Date(remindAt);
                      newRemindAt.setHours(hours);
                      newRemindAt.setMinutes(minutes);
                      setRemindAt(newRemindAt);
                    } else {
                      const newRemindAt = startOfDay(currentDate);
                      newRemindAt.setHours(hours);
                      newRemindAt.setMinutes(minutes);
                      setRemindAt(newRemindAt);
                    }
                  }}
                  className="w-full"
                  disabled={isSaving}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="section">Section</Label>
        <Select value={sectionId || ''} onValueChange={setSectionId} disabled={isSaving}>
          <SelectTrigger id="section">
            <SelectValue placeholder="No Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No Section</SelectItem>
            {sections.map(sec => (
              <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="parent-task">Parent Task (for subtasks)</Label>
        <Select value={parentTaskId || ''} onValueChange={setParentTaskId} disabled={isSaving}>
          <SelectTrigger id="parent-task">
            <SelectValue placeholder="No Parent Task" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No Parent Task</SelectItem>
            {topLevelTasks.map(task => (
              <SelectItem key={task.id} value={task.id}>{task.description}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="link">Link</Label>
        <Input
          id="link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="e.g., https://example.com"
          disabled={isSaving}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image-url">Image URL</Label>
        <Input
          id="image-url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="e.g., https://example.com/image.jpg"
          disabled={isSaving}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || !description.trim()}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {initialData ? 'Save Changes' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;