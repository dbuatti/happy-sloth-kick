import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, BellRing, Lightbulb } from 'lucide-react'; // Added Lightbulb icon
import { cn } from "@/lib/utils";
import CategorySelector from "./CategorySelector";
import PrioritySelector from "./PrioritySelector";
import SectionSelector from "./SectionSelector";
import { format, setHours, setMinutes, parse, addDays, addWeeks, addMonths, startOfDay } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskSection, Category } from '@/hooks/useTasks'; // Import TaskSection and Category types

interface AddTaskFormProps {
  onAddTask: (taskData: {
    description: string;
    category: string; // This is the category ID
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
  allCategories: Category[]; // New prop for all categories
  autoFocus?: boolean; // Added autoFocus prop
  preselectedSectionId?: string | null; // New prop for pre-selecting section
}

// Helper function for natural language parsing
const parseNaturalLanguage = (text: string, categories: Category[]) => {
  let dueDate: Date | undefined = undefined;
  let remindAt: Date | undefined = undefined;
  let priority: string | undefined = undefined;
  let categoryId: string | undefined = undefined; // This will be the category ID
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
  // Map category names to their IDs
  const categoryNameToIdMap = new Map(categories.map(cat => [cat.name.toLowerCase(), cat.id]));

  for (const category of categories) {
    const regex = new RegExp(`\\b${category.name.toLowerCase()}\\b`, 'i');
    if (regex.test(tempDescription)) {
      categoryId = category.id;
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
    categoryId: categoryId, // Corrected from parsedCategoryId
  };
};

const AddTaskForm: React.FC<AddTaskFormProps> = ({ onAddTask, userId, onTaskAdded, sections, allCategories, autoFocus, preselectedSectionId }) => {
  const [newTaskDescription, setNewTaskDescription] = useState<string>('');
  const [newTaskCategory, setNewTaskCategory] = useState<string>(''); // Initialize empty, will be set by default or natural language
  const [newTaskPriority, setNewTaskPriority] = useState<string>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(undefined);
  const [newTaskNotes, setNewTaskNotes] = useState<string>('');
  const [newTaskRemindAt, setNewTaskRemindAt] = useState<Date | undefined>(undefined);
  const [newReminderTime, setNewReminderTime] = useState<string>('');
  const [newTaskSectionId, setNewTaskSectionId] = useState<string | null>(null);
  const [newTaskRecurringType, setNewTaskRecurringType] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [isAdding, setIsAdding] = useState(false);

  // Set default category on initial load or when allCategories become available
  useEffect(() => {
    if (allCategories.length > 0 && !newTaskCategory) {
      const generalCategory = allCategories.find(cat => cat.name.toLowerCase() === 'general');
      if (generalCategory) {
        setNewTaskCategory(generalCategory.id);
      }
    }
  }, [allCategories, newTaskCategory]);

  // Set preselected section if provided
  useEffect(() => {
    setNewTaskSectionId(preselectedSectionId || null);
  }, [preselectedSectionId]);

  const handleSuggest = () => {
    const {
      dueDate,
      remindAt,
      reminderTimeStr,
      priority,
      categoryId, // Corrected from parsedCategoryId
    } = parseNaturalLanguage(newTaskDescription, allCategories);

    if (priority) {
      setNewTaskPriority(priority);
    }
    if (categoryId) { // Corrected from parsedCategoryId
      setNewTaskCategory(categoryId);
    }
    if (dueDate) {
      setNewTaskDueDate(dueDate);
    }
    if (remindAt) {
      setNewTaskRemindAt(remindAt);
      if (reminderTimeStr) {
        setNewReminderTime(format(remindAt, 'HH:mm'));
      }
    }
  };

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
      category: newTaskCategory, // Pass the category ID
      priority: newTaskPriority,
      due_date: newTaskDueDate ? newTaskDueDate.toISOString() : null,
      notes: newTaskNotes || null,
      remind_at: finalRemindAt ? finalRemindAt.toISOString() : null,
      section_id: newTaskSectionId,
      recurring_type: newTaskRecurringType,
    });
    if (success) {
      setNewTaskDescription('');
      // Reset to default category ID after adding task
      const generalCategory = allCategories.find(cat => cat.name.toLowerCase() === 'general');
      setNewTaskCategory(generalCategory?.id || ''); 
      setNewTaskPriority('medium');
      setNewTaskDueDate(undefined);
      setNewTaskNotes('');
      setNewTaskRemindAt(undefined);
      setNewReminderTime('');
      setNewTaskRecurringType('none');
      // Do NOT reset newTaskSectionId here, as it might be preselected for the next task
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
    <div className="p-4 bg-gray-50 dark:bg-card rounded-lg">
      <h2 className="text-xl font-semibold mb-3">Add New Task</h2>
      <div className="space-y-3">
        <div>
          <Label htmlFor="new-task-description">Task Description</Label>
          <div className="flex gap-2">
            <Input
              id="new-task-description"
              placeholder="Task description (e.g., 'Buy groceries by tomorrow high priority')"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAdding}
              autoFocus={autoFocus} // Apply autoFocus here
            />
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              onClick={handleSuggest} 
              disabled={isAdding || !newTaskDescription.trim()}
              title="Suggest details from description"
            >
              <Lightbulb className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CategorySelector value={newTaskCategory} onChange={setNewTaskCategory} userId={userId} categories={allCategories} />
          <PrioritySelector value={newTaskPriority} onChange={setNewTaskPriority} />
        </div>

        <div>
          <SectionSelector value={newTaskSectionId} onChange={setNewTaskSectionId} userId={userId} sections={sections} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            rows={2}
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