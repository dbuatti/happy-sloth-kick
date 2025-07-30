import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, BellRing, Lightbulb } from 'lucide-react';
import { cn } from "@/lib/utils";
import CategorySelector from "./CategorySelector";
import PrioritySelector from "./PrioritySelector";
import SectionSelector from "./SectionSelector";
import { format, setHours, setMinutes, parse, addDays, addWeeks, addMonths, startOfDay, parseISO } from 'date-fns'; // Added parseISO
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, TaskSection, Category } from '@/hooks/useTasks'; // Import Task, TaskSection, Category types

interface TaskFormProps {
  initialData?: Task | null; // Optional: for editing an existing task
  onSave: (taskData: {
    description: string;
    category: string;
    priority: string;
    due_date: string | null;
    notes: string | null;
    remind_at: string | null;
    section_id: string | null;
    recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
    parent_task_id: string | null;
  }) => Promise<any>;
  onCancel: () => void;
  userId: string | null;
  sections: TaskSection[];
  allCategories: Category[];
  autoFocus?: boolean;
  preselectedSectionId?: string | null;
  parentTaskId?: string | null; // For sub-tasks
}

// Helper function for natural language parsing
const parseNaturalLanguage = (text: string, categories: Category[]) => {
  let dueDate: Date | undefined = undefined;
  let remindAt: Date | undefined = undefined;
  let priority: string | undefined = undefined;
  let categoryId: string | undefined = undefined;
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

  // Category detection
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
    categoryId,
  };
};

const TaskForm: React.FC<TaskFormProps> = ({
  initialData,
  onSave,
  onCancel,
  userId,
  sections,
  allCategories,
  autoFocus = false,
  preselectedSectionId = null,
  parentTaskId = null,
}) => {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [remindAt, setRemindAt] = useState<Date | undefined>(undefined);
  const [reminderTime, setReminderTime] = useState('');
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [recurringType, setRecurringType] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [isSaving, setIsSaving] = useState(false);

  // Set initial data for editing or defaults for new task
  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description);
      setCategory(initialData.category);
      setPriority(initialData.priority);
      setDueDate(initialData.due_date ? parseISO(initialData.due_date) : undefined);
      setNotes(initialData.notes || '');
      setRemindAt(initialData.remind_at ? parseISO(initialData.remind_at) : undefined);
      setReminderTime(initialData.remind_at ? format(parseISO(initialData.remind_at), 'HH:mm') : '');
      setSectionId(initialData.section_id);
      setRecurringType(initialData.recurring_type);
    } else {
      // Defaults for new task
      setDescription('');
      setNotes('');
      setDueDate(undefined);
      setRemindAt(undefined);
      setReminderTime('');
      setRecurringType('none');
      setPriority('medium');
      setSectionId(preselectedSectionId); // Use preselected section if provided

      // Set default category on initial load or when allCategories become available
      if (allCategories.length > 0) {
        const generalCategory = allCategories.find(cat => cat.name.toLowerCase() === 'general');
        if (generalCategory) {
          setCategory(generalCategory.id);
        } else {
          setCategory(allCategories[0]?.id || ''); // Fallback to first category if no 'General'
        }
      } else {
        setCategory(''); // No categories loaded yet
      }
    }
  }, [initialData, preselectedSectionId, allCategories]);

  const handleSuggest = useCallback(() => {
    const {
      dueDate: suggestedDueDate,
      remindAt: suggestedRemindAt,
      reminderTimeStr: suggestedReminderTimeStr,
      priority: suggestedPriority,
      categoryId: suggestedCategoryId,
    } = parseNaturalLanguage(description, allCategories);

    if (suggestedPriority) {
      setPriority(suggestedPriority);
    }
    if (suggestedCategoryId) {
      setCategory(suggestedCategoryId);
    }
    if (suggestedDueDate) {
      setDueDate(suggestedDueDate);
    }
    if (suggestedRemindAt) {
      setRemindAt(suggestedRemindAt);
      if (suggestedReminderTimeStr) {
        setReminderTime(format(suggestedRemindAt, 'HH:mm'));
      }
    }
  }, [description, allCategories]);

  const handleSubmit = async () => {
    if (!description.trim()) {
      // Add a toast error here if needed
      return;
    }

    let finalRemindAt = remindAt;
    if (finalRemindAt && reminderTime) {
      const [hours, minutes] = reminderTime.split(':').map(Number);
      finalRemindAt = setMinutes(setHours(finalRemindAt, hours), minutes);
    } else if (finalRemindAt && !reminderTime) {
      finalRemindAt = undefined; // Clear reminder if date is set but time is empty
    }

    setIsSaving(true);
    const success = await onSave({
      description: description.trim(),
      category: category,
      priority: priority,
      due_date: dueDate ? dueDate.toISOString() : null,
      notes: notes || null,
      remind_at: finalRemindAt ? finalRemindAt.toISOString() : null,
      section_id: sectionId,
      recurring_type: recurringType,
      parent_task_id: parentTaskId,
    });
    setIsSaving(false);
    if (success) {
      onCancel(); // Close form on successful save
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && description.trim()) {
      event.preventDefault(); // Prevent new line in textarea
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div>
        <Label htmlFor="task-description">Task Description</Label>
        <div className="flex gap-2">
          <Input
            id="task-description"
            placeholder="Task description (e.g., 'Buy groceries by tomorrow high priority')"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            autoFocus={autoFocus}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSuggest}
            disabled={isSaving || !description.trim()}
            title="Suggest details from description"
            aria-label="Suggest task details"
          >
            <Lightbulb className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <CategorySelector value={category} onChange={setCategory} userId={userId} categories={allCategories} />
        <PrioritySelector value={priority} onChange={setPriority} />
      </div>

      <div>
        <SectionSelector value={sectionId} onChange={setSectionId} userId={userId} sections={sections} />
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
                  !dueDate && "text-muted-foreground"
                )}
                disabled={isSaving}
                aria-label="Select due date"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label>Recurring</Label>
          <Select value={recurringType} onValueChange={(value: 'none' | 'daily' | 'weekly' | 'monthly') => setRecurringType(value)} disabled={!!initialData?.parent_task_id || isSaving}>
            <SelectTrigger aria-label="Select recurrence type">
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
                  !remindAt && "text-muted-foreground"
                )}
                disabled={isSaving}
                aria-label="Set reminder date"
              >
                <BellRing className="mr-2 h-4 w-4" />
                {remindAt ? format(remindAt, "PPP") : <span>Set reminder date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={remindAt}
                onSelect={setRemindAt}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="w-24"
            disabled={isSaving || !remindAt}
            aria-label="Set reminder time"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="task-notes">Notes</Label>
        <Textarea
          id="task-notes"
          placeholder="Add notes about this task..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          disabled={isSaving}
        />
      </div>

      <div className="flex justify-end space-x-2 mt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSaving || !description.trim()}>
          {isSaving ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Task')}
        </Button>
      </div>
    </div>
  );
};

export default TaskForm;