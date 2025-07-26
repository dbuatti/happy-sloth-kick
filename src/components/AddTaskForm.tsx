import { useState, useEffect, FC, KeyboardEvent } from 'react';
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
import SectionSelector from "./SectionSelector"; // Import SectionSelector
import { format, setHours, setMinutes, parse, addDays, addWeeks, addMonths, startOfDay } from 'date-fns'; // Added parse, addDays, addWeeks, addMonths, startOfDay
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddTaskFormProps {
  onAddTask: (taskData: {
    description: string;
    recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
    category: string;
    priority: string;
    due_date: string | null;
    notes: string | null;
    remind_at: string | null;
    section_id: string | null; // New: for task sections
  }) => Promise<any>;
  userId: string | null;
  onTaskAdded?: () => void; // New prop to close dialog/sheet
}

// Helper function for natural language parsing
const parseNaturalLanguage = (text: string) => {
  let dueDate: Date | undefined = undefined;
  let remindAt: Date | undefined = undefined;
  let priority: string | undefined = undefined;
  let category: string | undefined = undefined;
  let tempDescription = text; // Use a temporary variable for parsing

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
      tempDescription = tempDescription.replace(regex, '').trim(); // Remove keyword from temp description
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
      tempDescription = tempDescription.replace(regex, '').trim(); // Remove keyword from temp description
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
        const parsedDate = parse(match[0], 'MMM d, yyyy', new Date()); // Try with year
        if (isNaN(parsedDate.getTime())) {
          const currentYear = new Date().getFullYear();
          const parsedDateNoYear = parse(`${match[0]} ${currentYear}`, 'MMM d yyyy', new Date()); // Try without year, add current
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
      // Attempt to parse time. If no date is set, use today.
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
    description: text, // Return original description, not the temporary one
    dueDate,
    remindAt,
    reminderTimeStr,
    priority,
    category,
  };
};

const AddTaskForm: FC<AddTaskFormProps> = ({ onAddTask, userId, onTaskAdded }) => {
  const [newTaskDescription, setNewTaskDescription] = useState<string>('');
  const [newTaskRecurringType, setNewTaskRecurringType] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [newTaskCategory, setNewTaskCategory] = useState<string>('general');
  const [newTaskPriority, setNewTaskPriority] = useState<string>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(undefined);
  const [newTaskNotes, setNewTaskNotes] = useState<string>('');
  const [newTaskRemindAt, setNewTaskRemindAt] = useState<Date | undefined>(undefined);
  const [newReminderTime, setNewReminderTime] = useState<string>('');
  const [newTaskSectionId, setNewTaskSectionId] = useState<string | null>(null); // New state for section_id
  const [isAdding, setIsAdding] = useState(false);

  // AI-powered suggestions based on description
  useEffect(() => {
    const {
      dueDate,
      remindAt,
      reminderTimeStr,
      priority,
      category,
    } = parseNaturalLanguage(newTaskDescription); // Parse the current description

    // Only update if the user hasn't manually changed it from the default
    // This is a simple heuristic; more advanced logic could track user overrides
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
    // Removed: setNewTaskDescription(parsedDescription);
  }, [newTaskDescription, newTaskPriority, newTaskCategory, newTaskDueDate, newTaskRemindAt]); // Add other dependencies to prevent infinite loops if they are also updated by parsing

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
      recurring_type: newTaskRecurringType,
      category: newTaskCategory,
      priority: newTaskPriority,
      due_date: newTaskDueDate ? newTaskDueDate.toISOString() : null,
      notes: newTaskNotes || null,
      remind_at: finalRemindAt ? finalRemindAt.toISOString() : null,
      section_id: newTaskSectionId, // Save section_id
    });
    if (success) {
      setNewTaskDescription('');
      setNewTaskRecurringType('none');
      setNewTaskCategory('general');
      setNewTaskPriority('medium');
      setNewTaskDueDate(undefined);
      setNewTaskNotes('');
      setNewTaskRemindAt(undefined);
      setNewReminderTime('');
      setNewTaskSectionId(null); // Reset section_id
      onTaskAdded?.(); // Call callback to close dialog/sheet
    }
    setIsAdding(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CategorySelector value={newTaskCategory} onChange={setNewTaskCategory} userId={userId} />
          <PrioritySelector value={newTaskPriority} onChange={setNewTaskPriority} />
        </div>

        <div>
          <SectionSelector value={newTaskSectionId} onChange={setNewTaskSectionId} userId={userId} />
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
          
          <div className="space-y-2">
            <Label htmlFor="recurring-type">Recurring</Label>
            <Select 
              value={newTaskRecurringType} 
              onValueChange={(value) => setNewTaskRecurringType(value as 'none' | 'daily' | 'weekly' | 'monthly')} 
              disabled={isAdding}
            >
              <SelectTrigger id="recurring-type">
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