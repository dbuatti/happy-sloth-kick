import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { Task, TaskSection, TaskCategory } from '@/types/task';
import { showError, showLoading, dismissToast, showSuccess } from '@/utils/toast';
import { useSound } from '@/context/SoundContext';
import { suggestTaskDetails } from '@/integrations/supabase/api';
import { QuickAddTaskProps } from '@/types/props';

const QuickAddTask: React.FC<QuickAddTaskProps> = ({
  onAddTask,
  sections,
  allCategories,
  currentDate,
  setPrefilledTaskData,
}) => {
  const [quickAddTaskDescription, setQuickAddTaskDescription] = useState('');
  const { playSound } = useSound();

  const handleQuickAddTask = async () => {
    if (!quickAddTaskDescription.trim()) {
      showError('Task description cannot be empty.');
      return;
    }

    playSound('add');
    const loadingToastId = showLoading('Thinking...');

    try {
      const categoriesForAI = allCategories.map(cat => ({ id: cat.id, name: cat.name }));
      const suggestions = await suggestTaskDetails(quickAddTaskDescription.trim(), categoriesForAI, currentDate);
      dismissToast(loadingToastId);

      const suggestedCategoryId = allCategories.find(cat => cat.name.toLowerCase() === suggestions.suggestedCategory?.toLowerCase())?.id || allCategories.find(cat => cat.name.toLowerCase() === 'general')?.id || allCategories[0]?.id || null;
      const suggestedSectionId = sections.find(sec => sec.name.toLowerCase() === suggestions.suggestedSection?.toLowerCase())?.id || null;

      const success = await onAddTask({
        description: suggestions.cleanedDescription,
        category: suggestedCategoryId,
        priority: suggestions.suggestedPriority,
        due_date: suggestions.suggestedDueDate,
        notes: suggestions.suggestedNotes,
        remind_at: suggestions.suggestedRemindAt,
        section_id: suggestedSectionId,
        parent_task_id: null,
        link: suggestions.suggestedLink,
      });

      if (success) {
        setQuickAddTaskDescription('');
        showSuccess('Task added with AI suggestions!');
      } else {
        showError('Failed to add task with AI suggestions.');
      }
    } catch (error: any) {
      dismissToast(loadingToastId);
      showError('Failed to get AI suggestions or add task.');
      console.error('AI suggestion error:', error);
    }
  };

  return (
    <div className="flex space-x-2">
      <Input
        placeholder="Quick add a task (e.g., 'Call mom tomorrow high priority')"
        value={quickAddTaskDescription}
        onChange={(e) => setQuickAddTaskDescription(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleQuickAddTask();
          }
        }}
        className="flex-grow"
      />
      <Button onClick={handleQuickAddTask} size="icon">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default QuickAddTask;