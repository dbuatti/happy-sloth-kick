import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Plus, Sparkles } from 'lucide-react';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { suggestTaskDetails, AICategory, AISuggestionResult } from '@/integrations/supabase/api'; // Import AISuggestionResult
import { dismissToast, showError, showLoading } from '@/utils/toast';
import { Button } from '@/components/ui/button'; // Added Button import

interface QuickAddTaskProps {
  sectionId: string | null;
  onAddTask: (taskData: {
    description: string;
    section_id: string | null;
    category: string;
    priority: Task['priority'];
    due_date?: string | null;
    notes?: string | null;
    remind_at?: string | null;
    link?: string | null;
  }) => Promise<any>;
  defaultCategoryId: string;
  isDemo?: boolean;
  allCategories: Category[]; // Added prop
  sections: TaskSection[]; // Added prop
  currentDate: Date; // Added prop
}

const QuickAddTask: React.FC<QuickAddTaskProps> = ({
  sectionId,
  onAddTask,
  defaultCategoryId,
  isDemo = false,
  allCategories,
  sections,
  currentDate,
}) => {
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSaving(true);
    setIsSuggesting(true);
    const loadingToastId = showLoading('Getting AI suggestions...');

    try {
      const categoriesForAI: AICategory[] = allCategories.map(cat => ({ id: cat.id, name: cat.name })); // Use AICategory
      const suggestions: AISuggestionResult | null = await suggestTaskDetails(description.trim(), categoriesForAI, currentDate);
      dismissToast(loadingToastId);
      setIsSuggesting(false);

      let taskDataToSend: Parameters<typeof onAddTask>[0];

      if (suggestions) {
        const suggestedCategoryId = allCategories.find(cat => cat.name.toLowerCase() === suggestions.category.toLowerCase())?.id || defaultCategoryId;
        // Fix: Ensure suggestions.section is a string before comparison
        const suggestedSectionId = sections.find(sec => sec.name.toLowerCase() === (suggestions.section?.toLowerCase() || ''))?.id || sectionId;

        taskDataToSend = {
          description: suggestions.cleanedDescription,
          category: suggestedCategoryId,
          priority: suggestions.priority as Task['priority'],
          due_date: suggestions.dueDate,
          notes: suggestions.notes,
          remind_at: suggestions.remindAt,
          section_id: suggestedSectionId,
          link: suggestions.link,
        };
      } else {
        showError('AI suggestions failed. Adding task with default details.');
        taskDataToSend = {
          description: description.trim(),
          category: defaultCategoryId,
          priority: 'medium',
          section_id: sectionId,
        };
      }

      const success = await onAddTask(taskDataToSend);
      if (success) {
        setDescription('');
      }
    } catch (error) {
      dismissToast(loadingToastId);
      showError('An error occurred while adding the task.');
      console.error('QuickAddTask error:', error);
    } finally {
      setIsSaving(false);
      setIsSuggesting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-2 py-1">
      <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Input
        placeholder="Add a task (AI-powered) and press Enter..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="h-8 border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
        disabled={isSaving || isDemo}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <Button type="submit" size="icon" variant="ghost" className="h-8 w-8" disabled={isSaving || isDemo || !description.trim()}>
        {isSuggesting ? <span className="animate-spin h-3.5 w-3.5 border-b-2 border-primary rounded-full" /> : <Sparkles className="h-3.5 w-3.5" />}
      </Button>
    </form>
  );
};

export default QuickAddTask;