"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Lightbulb, ChevronDown, ChevronUp, X } from 'lucide-react'; // Added X icon
import { Category, TaskSection, NewTaskData } from '@/hooks/useTasks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { suggestTaskDetails, AICategory, AISuggestionResult } from '@/integrations/supabase/api';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip components
import { AnimatePresence, motion } from 'framer-motion'; // For animation

interface QuickAddTaskProps {
  onAddTask: (taskData: NewTaskData) => Promise<any>;
  defaultCategoryId: string;
  isDemo?: boolean;
  allCategories: Category[];
  currentDate: Date;
  sections: TaskSection[]; // Added sections prop
  // Removed: createSection: (name: string) => Promise<void>;
  // Removed: updateSection: (sectionId: string, newName: string) => Promise<void>;
  // Removed: deleteSection: (sectionId: string) => Promise<void>;
  // Removed: updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
}

const QuickAddTask: React.FC<QuickAddTaskProps> = ({
  onAddTask,
  defaultCategoryId,
  isDemo,
  allCategories,
  currentDate,
  sections, // Destructure sections
}) => {
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(defaultCategoryId);
  const [selectedSection, setSelectedSection] = useState<string | null>(null); // New state for selected section
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [isAdding, setIsAdding] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false); // State for expandable options
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedCategory(defaultCategoryId);
  }, [defaultCategoryId]);

  // Auto-focus input on mount or after adding a task
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]); // Re-focus when isAdding changes (i.e., after a task is added/attempted)

  const handleAddTask = useCallback(async () => {
    if (!description.trim()) {
      showError('Task description cannot be empty.');
      return;
    }
    setIsAdding(true);
    const newTask: NewTaskData = {
      description: description.trim(),
      category: selectedCategory || null,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      section_id: selectedSection, // Include selected section
    };
    const success = await onAddTask(newTask);
    setIsAdding(false);
    if (success) {
      setDescription('');
      setSelectedCategory(defaultCategoryId);
      setSelectedSection(null); // Reset selected section
      setDueDate(undefined);
      showSuccess('Task added!');
      // inputRef.current?.focus(); // Removed, handled by useEffect on isAdding
    }
  }, [description, selectedCategory, selectedSection, dueDate, onAddTask, defaultCategoryId]);

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
        const suggestedCategory = allCategories.find(cat => cat.name.toLowerCase() === suggestions.category.toLowerCase());
        setSelectedCategory(suggestedCategory?.id || defaultCategoryId);
        
        if (suggestions.dueDate) {
          setDueDate(parseISO(suggestions.dueDate));
        } else {
          setDueDate(undefined);
        }

        const suggestedSection = sections.find(s => s.name.toLowerCase() === (suggestions.section?.toLowerCase() || ''));
        if (suggestedSection) {
          setSelectedSection(suggestedSection.id);
        } else {
          setSelectedSection(null);
        }
        // Quick add doesn't support all fields, so we only apply relevant ones
        setShowAdvancedOptions(true); // Show advanced options if AI suggests them
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      showError('Failed to get AI suggestions. Please try again.');
    } finally {
      setIsSuggesting(false);
      dismissToast(toastId);
    }
  }, [description, allCategories, defaultCategoryId, currentDate, sections]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && description.trim()) {
      event.preventDefault();
      handleAddTask();
    }
  };

  const handleSectionChange = useCallback((value: string) => {
    setSelectedSection(value === "no-section-selected" ? null : value);
  }, []);

  const canSuggest = description.trim().length > 5; // Enable suggestion if description is long enough

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
          <Input
            ref={inputRef}
            placeholder="Quick add a new task..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAdding || isDemo || isSuggesting}
            className="flex-grow h-9 text-base pr-8" // Added pr-8 for clear button
          />
          {description && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setDescription('')}
              className="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label="Clear input"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={canSuggest ? "default" : "outline"} // Make it default variant when active
              size="icon"
              onClick={handleSuggest}
              disabled={isAdding || isDemo || isSuggesting || !canSuggest}
              title="Get AI suggestions for task details"
              aria-label="Suggest task details"
              className={cn("h-9 w-9")}
            >
              {isSuggesting ? (
                <span className="animate-spin h-3.5 w-3.5 border-b-2 border-primary rounded-full" />
              ) : (
                <Lightbulb className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Get AI suggestions for category, priority, due date, etc.</p>
          </TooltipContent>
        </Tooltip>
        <Button onClick={handleAddTask} disabled={isAdding || isDemo || !description.trim()} className="h-9 text-base">
          {isAdding ? 'Adding...' : <Plus className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowAdvancedOptions(prev => !prev)}
          aria-label={showAdvancedOptions ? "Hide advanced options" : "Show advanced options"}
          className="h-9 w-9"
        >
          {showAdvancedOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      <AnimatePresence>
        {showAdvancedOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isAdding || isDemo || isSuggesting}>
              <SelectTrigger className="h-9 text-base w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map(category => (
                  <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSection ?? "no-section-selected"} onValueChange={handleSectionChange} disabled={isAdding || isDemo || isSuggesting}>
              <SelectTrigger className="h-9 text-base w-[180px]">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-section-selected">No Section</SelectItem>
                {sections.map(section => (
                  <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[180px] justify-start text-left font-normal h-9 text-base",
                    !dueDate && "text-muted-foreground"
                  )}
                  disabled={isAdding || isDemo || isSuggesting}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {dueDate ? format(dueDate, "PPP") : <span>Due Date</span>}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuickAddTask;