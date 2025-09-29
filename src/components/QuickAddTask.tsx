"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Lightbulb, Calendar as CalendarIcon, BellRing } from 'lucide-react';
import { Category, TaskSection, NewTaskData } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { format, setHours, setMinutes, parseISO, isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { suggestTaskDetails, AICategory, AISuggestionResult } from '@/integrations/supabase/api';
import { showError, showLoading, dismissToast, showSuccess } from '@/utils/toast';

interface QuickAddTaskProps {
  sectionId: string | null;
  onAddTask: (taskData: NewTaskData) => Promise<any>;
  defaultCategoryId: string;
  isDemo?: boolean;
  allCategories: Category[];
  // Removed sections as it's not used
  currentDate: Date;
}

const QuickAddTask: React.FC<QuickAddTaskProps> = ({
  sectionId,
  onAddTask,
  defaultCategoryId,
  isDemo = false,
  allCategories,
  // Removed sections from destructuring
  currentDate,
}) => {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(defaultCategoryId);
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [remindAtDate, setRemindAtDate] = useState<Date | null>(null);
  const [remindAtTime, setRemindAtTime] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setCategory(defaultCategoryId);
  }, [defaultCategoryId]);

  const handleAddTask = async () => {
    if (!description.trim()) {
      showError('Task description cannot be empty.');
      return;
    }

    setIsAdding(true);
    let finalRemindAt: Date | null = null;
    if (remindAtDate && remindAtTime) {
      const [hours, minutes] = remindAtTime.split(':').map(Number);
      finalRemindAt = setMinutes(setHours(remindAtDate, hours), minutes);
    }

    const newTaskData: NewTaskData = {
      description: description.trim(),
      category: category,
      priority: priority,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      remind_at: finalRemindAt ? finalRemindAt.toISOString() : null,
      section_id: sectionId,
    };

    const success = await onAddTask(newTaskData);
    setIsAdding(false);
    if (success) {
      setDescription('');
      setCategory(defaultCategoryId);
      setPriority('medium');
      setDueDate(null);
      setRemindAtDate(null);
      setRemindAtTime('');
      setShowAdvanced(false);
    }
  };

  const handleSuggest = useCallback(async () => {
    if (!description.trim()) {
      showError('Please enter a task description to get suggestions.');
      return;
    }
    setIsSuggesting(true);
    const toastId = showLoading('Getting AI suggestions...');
    try {
      const categoriesForAI: AICategory[] = allCategories.map(cat => ({ id: cat.id, name: cat.name }));
      const suggestions: AISuggestionResult | null = await suggestTaskDetails(description, categoriesForAI, currentDate);

      if (suggestions) {
        setDescription(suggestions.cleanedDescription);
        setPriority(suggestions.priority);
        setCategory(allCategories.find(cat => cat.name.toLowerCase() === suggestions.category.toLowerCase())?.id || defaultCategoryId);
        
        if (suggestions.dueDate) {
          setDueDate(parseISO(suggestions.dueDate));
        } else {
          setDueDate(null);
        }

        if (suggestions.remindAt) {
          const parsedRemindAt = parseISO(suggestions.remindAt);
          if (isValid(parsedRemindAt)) {
            setRemindAtDate(parsedRemindAt);
            setRemindAtTime(format(parsedRemindAt, 'HH:mm'));
          }
        } else {
          setRemindAtDate(null);
          setRemindAtTime('');
        }
        showSuccess('AI suggestions applied!');
        setShowAdvanced(true); // Show advanced options if suggestions are applied
      } else {
        showError('No AI suggestions found or an error occurred.');
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      showError('Failed to get AI suggestions. Please try again.');
    } finally {
      setIsSuggesting(false);
      dismissToast(toastId);
    }
  }, [description, allCategories, defaultCategoryId, currentDate]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && description.trim() && !isAdding && !isSuggesting) {
      event.preventDefault();
      handleAddTask();
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2 border rounded-lg bg-background shadow-sm">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Add a new task... (e.g., 'Buy groceries tomorrow high priority')"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDemo || isAdding || isSuggesting}
          className="flex-1 h-9 text-base"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleSuggest}
          disabled={isDemo || isAdding || isSuggesting || !description.trim()}
          title="Suggest details from description"
          aria-label="Suggest task details"
          className="h-9 w-9"
        >
          {isSuggesting ? (
            <span className="animate-spin h-3.5 w-3.5 border-b-2 border-primary rounded-full" />
          ) : (
            <Lightbulb className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          onClick={handleAddTask}
          disabled={isDemo || isAdding || !description.trim()}
          className="h-9 px-4"
        >
          {isAdding ? 'Adding...' : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <Select value={category} onValueChange={setCategory} disabled={isDemo || isAdding || isSuggesting}>
            <SelectTrigger className="h-9 text-base">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              {allCategories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priority} onValueChange={setPriority} disabled={isDemo || isAdding || isSuggesting}>
            <SelectTrigger className="h-9 text-base">
              <SelectValue placeholder="Select Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-9 text-base",
                  !dueDate && "text-muted-foreground"
                )}
                disabled={isDemo || isAdding || isSuggesting}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {dueDate ? format(dueDate, "PPP") : <span>Due Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarUI
                mode="single"
                selected={dueDate || undefined}
                onSelect={(day) => setDueDate(day || null)} {/* Corrected onSelect handler */}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal h-9 text-base",
                    !remindAtDate && "text-muted-foreground"
                  )}
                  disabled={isDemo || isAdding || isSuggesting}
                >
                  <BellRing className="mr-2 h-3.5 w-3.5" />
                  {remindAtDate ? format(remindAtDate, "PPP") : <span>Reminder Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarUI
                  mode="single"
                  selected={remindAtDate || undefined}
                  onSelect={(day) => setRemindAtDate(day || null)} {/* Corrected onSelect handler */}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              value={remindAtTime}
              onChange={(e) => setRemindAtTime(e.target.value)}
              className="w-24 h-9 text-base"
              disabled={isDemo || isAdding || isSuggesting || !remindAtDate}
            />
          </div>
        </div>
      )}

      <Button
        variant="link"
        onClick={() => setShowAdvanced(prev => !prev)}
        className="text-sm text-muted-foreground p-0 h-auto justify-start"
        disabled={isDemo || isAdding || isSuggesting}
      >
        {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
      </Button>
    </div>
  );
};

export default QuickAddTask;