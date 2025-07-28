import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, BellRing } from 'lucide-react';
import { cn } from "@/lib/utils";
import CategorySelector from "./CategorySelector";
import PrioritySelector from "./PrioritySelector";
import SectionSelector from "./SectionSelector";
import { format, setHours, setMinutes, parse, addDays, addWeeks, addMonths, startOfDay } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskSection } from '@/hooks/useTasks'; // Import TaskSection type

interface AddTaskFormProps {
  onAddTask: (taskData: {
    description: string;
    category: string;
    priority: string;
    due_date: string | null;
    notes: string | null;
    remind_at: string | null;
    section_id: string | null;
    recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  }) => Promise<any>;
  userId: string | null;
  onTaskAdded?: () => void;
  sections: TaskSection[]; // New prop for sections
}

// Helper function for natural language parsing
const parseNaturalLanguage = (text: string) => {
  let dueDate: Date | undefined = undefined;
  let remindAt: Date | undefined = undefined;
  let priority: string | undefined = undefined;
  let category: string | undefined = undefined;
  let tempDescription = text;

  // Priority detection
  const priorityKeywords = {
    'urgent': 'urgent', 'critical': 'urgent',
    'high': 'high', 'important': 'high',
    'medium': 'medium', 'normal': 'medium',
    'low': 'low', 'minor': 'low',
  };
  for (const [keyword, pValue] of Object.entries(priorityKeywords)) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(tempDescription)) {
      priority = pValue;
      tempDescription = tempDescription.replace(regex, '').trim();
      break;
    }
  }

  // Category detection (example keywords, can be expanded)
  const categoryKeywords = {
    'work': 'work', 'project': 'work', 'meeting': 'work',
    'personal': 'personal', 'home': 'personal', 'family': 'personal',
    'shopping': 'shopping', 'buy': 'shopping', 'groceries': 'shopping',
    'study': 'study', 'learn': 'study', 'read': 'study',
  };
  for (const [keyword, cValue] of Object.entries(categoryKeywords)) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(tempDescription)) {
      category = cValue;
      tempDescription = tempDescription.replace(regex, '').trim();
      break;
    }
  }

  // Date detection
  const today = startOfDay(new Date());
  if (/\btoday\b/i.test(tempDescription)) {
    dueDate = today;
    tempDescription = tempDescription.replace(/\btoday\b/i, '').trim();
  } else if (/\btomorrow\b/i.test(tempDescription)) {
    dueDate = addDays(today, 1);
    tempDescription = tempDescription.replace(/\btomorrow\b/i, '').trim();
  } else if (/\bnext week\b/i.test(tempDescription)) {
    dueDate = addWeeks(today, 1);
    tempDescription = tempDescription.replace(/\bnext week\b/i, '').trim();
  } else if (/\bnext month\b/i.test(tempDescription)) {
    dueDate = addMonths(today, 1);
    tempDescription = tempDescription.replace(/\bnext month\b/i, '').trim();
  } else {
    // Try to parse specific dates like "on Jan 15" or "12/25"
    const dateRegex = /(on|by)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}(,\s*\d{4})?|\d{1,2}\/\d{1,2}(?:[/]\d{2,4})?/i;
    const match = tempDescription.match(dateRegex);
    if (match) {
      try {
        const parsedDate = parse(match[0], 'MMM d, yyyy', new Date());
        if (isNaN(parsedDate.getTime())) {
          const currentYear = new Date().getFullYear();
          const parsedDateNoYear = parse(`${match[0]} ${currentYear}`, 'MMM d yyyy', new Date());
          if (!isNaN(parsedDateNoYear.getTime())) {
            dueDate = parsedDateNoYear;
          }
        } else {
          dueDate = parsedDate;
        }
        tempDescription = tempDescription.replace(match[0], '').trim();
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }

  // Time detection for reminder
  const timeRegex = /(at|by)\s*(\d{1,2}(:\d{2})?\s*(am|pm)?)/i;
  const timeMatch = tempDescription.match(timeRegex);
  let reminderTimeStr: string | undefined = undefined;
  if (timeMatch) {
    reminderTimeStr = timeMatch[2];
    tempDescription = tempDescription.replace(timeMatch[0], '').trim();
  }

  if (reminderTimeStr) {
    try {
      const baseDate = dueDate || new Date();
      let parsedTime = parse(reminderTimeStr, 'h:mm a', baseDate);
      if (isNaN(parsedTime.getTime())) {
        parsedTime = parse(reminderTimeStr, 'H:mm', baseDate);
      }
      if (!isNaN(parsedTime.getTime())) {
        remindAt = parsedTime;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  return {
    description: text,
    dueDate,
    remindAt,
    reminderTimeStr,
    priority,
    category,
  };
};

const AddTaskForm: React.FC<AddTaskFormProps> = ({ onAddTask, userId, onTaskAdded, sections }) => {
  const [newTaskDescription, setNewTaskDescription] = useState<string>('');
  const [newTaskCategory, setNewTaskCategory] = useState<string>('general');
  const [newTaskPriority, setNewTaskPriority] = useState<string>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(undefined);
  const [newTaskNotes, setNewTaskNotes] = useState<string>('');
  const [newTaskRemindAt, setNewTaskRemindAt] = useState<Date | undefined>(undefined);
  const [newReminderTime, setNewReminderTime] = useState<string>('');
  const [newTaskSectionId, setNewTaskSectionId] = useState<string | null>(null);
  const [newTaskRecurringType, setNewTaskRecurringType] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const {
      dueDate,
      remindAt,
      reminderTimeStr,
      priority,
      category,
    } = parseNaturalLanguage(newTaskDescription);

    if (priority && (newTaskPriority === 'medium' || !newTaskPriority)) {
      setNewTaskPriority(priority);
    }
    if (category && (newTaskCategory === 'general' || !newTaskCategory)) {
      setNewTaskCategory(category);
    }
    if (dueDate && !newTaskDueDate) {
      setNewTaskDueDate(dueDate);
    }
    if (remindAt && !newTaskRemindAt) {
      setNewTaskRemindAt(remindAt);
      if (reminderTimeStr) {
        setNewReminderTime(format(remindAt, 'HH:mm'));
      }
    }
  }, [newTaskDescription, newTaskPriority, newTaskCategory, newTaskDueDate, newTaskRemindAt]);

  const handleSubmit = async () => {
    if (!newTaskDescription.trim()) {
      return;
    }

    let finalRemindAt = newTaskRemindAt;
    if (finalRemindAt && newReminderTime) {
      const [hours, minutes] = newReminderTime.split(':').map(Number);
      finalRemindAt = setMinutes(setHours(finalRemindAt, hours), minutes);
    } else if (finalRemindAt && !newReminderTime) {
      finalRemindAt = undefined;
    }

    setIsAdding(true);
    const success = await onAddTask({
      description: newTaskDescription,
      category: newTaskCategory,
      priority: newTaskPriority,
      due_date: newTaskDueDate ? newTaskDueDate.toISOString() : null,
      notes: newTaskNotes || null,
      remind_at: finalRemindAt ? finalRemindAt.toISOString() : null,
      section_id: newTaskSectionId,
      recurring_type: newTaskRecurringType,
    });
    if (success) {
      setNewTaskDescription('');
      setNewTaskCategory('general');
      setNewTaskPriority('medium');
      setNewTaskDueDate(undefined);
      setNewTaskNotes('');
      setNewTaskRemindAt(undefined);
      setNewReminderTime('');
      setNewTaskSectionId(null);
      setNewTaskRecurringType('none');
      onTaskAdded?.();
    }
    setIsAdding(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && newTaskDescription.trim()) {
      handleSubmit();
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-card rounded-lg">
      <h2 className="text-2xl font-semibold mb-4">Add New Task</h2>
      <div className="space-y-4">
        <div>
          <Label htmlFor="new-task-description">Task Description</Label>
          <Input
            id="new-task-description"
            placeholder="Task description"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAdding}
            autoFocus
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CategorySelector value={newTaskCategory} onChange={setNewTaskCategory} userId={userId} />
          <PrioritySelector value={newTaskPriority} onChange={setNewTaskPriority} />
        </div>

        <div>
          <SectionSelector value={newTaskSectionId} onChange={setNewTaskSectionId} userId={userId} sections={sections} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !newTaskDueDate && "text-muted-foreground"
                  )}
                  disabled={isAdding}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {newTaskDueDate ? format(newTaskDueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={newTaskDueDate}
                  onSelect={setNewTaskDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <Label>Recurring</Label>
            <Select value={newTaskRecurringType} onValueChange={(value: 'none' | 'daily' | 'weekly' | 'monthly') => setNewTaskRecurringType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select recurrence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Reminder</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !newTaskRemindAt && "text-muted-foreground"
                  )}
                  disabled={isAdding}
                >
                  <BellRing className="mr-2 h-4 w-4" />
                  {newTaskRemindAt ? format(newTaskRemindAt, "PPP") : <span>Set reminder date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={newTaskRemindAt}
                  onSelect={setNewTaskRemindAt}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              value={newReminderTime}
              onChange={(e) => setNewReminderTime(e.target.value)}
              className="w-24"
              disabled={isAdding || !newTaskRemindAt}
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="new-task-notes">Notes</Label>
          <Textarea
            id="new-task-notes"
            placeholder="Add notes about this task..."
            value={newTaskNotes}
            onChange={(e) => setNewTaskNotes(e.target.value)}
            rows={3}
            disabled={isAdding}
          />
        </div>
        
        <Button onClick={handleSubmit} className="w-full" disabled={isAdding}>
          {isAdding ? 'Adding...' : 'Add Task'}
        </Button>
      </div>
    </div>
  );
};

export default AddTaskForm;