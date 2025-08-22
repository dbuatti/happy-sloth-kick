import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Plus, Settings } from 'lucide-react'; // Removed unused Filter
import { Task, TaskSection, TaskCategory, DailyTaskCount, TaskPriority } from '@/types/task'; // Added TaskPriority, removed unused cn
import { showError, showLoading, dismissToast, showSuccess } from '@/utils/toast';
import { useSound } from '@/context/SoundContext';
import { suggestTaskDetails } from '@/integrations/supabase/api';
import ManageCategoriesDialog from './ManageCategoriesDialog';
import ManageSectionsDialog from './ManageSectionsDialog';
import { DailyTasksHeaderProps } from '@/types/props';

const DailyTasksHeader: React.FC<DailyTasksHeaderProps> = ({
  dailyProgress,
  toggleAllDoToday,
  currentDate,
  sections,
  allCategories,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  createCategory,
  updateCategory,
  deleteCategory,
  onAddTask,
  // setPrefilledTaskData, // Removed as it's not directly used here
  // isDemo, // Removed as it's not directly used here
}) => {
  const [quickAddTaskDescription, setQuickAddTaskDescription] = useState('');
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

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
    } catch (error) {
      dismissToast(loadingToastId);
      showError('Failed to get AI suggestions or add task.');
      console.error('AI suggestion error:', error);
    }
  };

  const progressPercentage = dailyProgress.totalPendingCount === 0 && dailyProgress.completedCount === 0
    ? 0
    : (dailyProgress.completedCount / (dailyProgress.totalPendingCount + dailyProgress.completedCount)) * 100;

  return (
    <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Today's Focus</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setIsManageSectionsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" /> Sections
          </Button>
          <Button variant="outline" onClick={() => setIsManageCategoriesOpen(true)}>
            <Settings className="h-4 w-4 mr-2" /> Categories
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          <span className="text-4xl font-bold text-blue-600">{dailyProgress.totalPendingCount}</span>
          <span className="text-sm text-gray-500">Tasks To Do</span>
        </div>
        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          <span className="text-4xl font-bold text-green-600">{dailyProgress.completedCount}</span>
          <span className="text-sm text-gray-500">Completed</span>
        </div>
        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          <span className="text-4xl font-bold text-red-600">{dailyProgress.overdueCount}</span>
          <span className="text-sm text-gray-500">Overdue</span>
        </div>
      </div>

      <div className="mb-4">
        <Progress value={progressPercentage} className="w-full" />
        <p className="text-sm text-gray-500 text-center mt-2">
          {progressPercentage.toFixed(0)}% of today's tasks completed
        </p>
      </div>

      <div className="flex space-x-2 mb-4">
        <Button
          variant="outline"
          onClick={() => toggleAllDoToday(true)}
          disabled={dailyProgress.totalPendingCount === 0}
          className="flex-1"
        >
          Turn Off All "Do Today"
        </Button>
        <Button
          variant="outline"
          onClick={() => toggleAllDoToday(false)}
          disabled={dailyProgress.totalPendingCount === 0}
          className="flex-1"
        >
          Turn On All "Do Today"
        </Button>
      </div>

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

      <ManageSectionsDialog
        isOpen={isManageSectionsOpen}
        onClose={() => setIsManageSectionsOpen(false)}
        sections={sections}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
      />

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={allCategories}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
      />
    </div>
  );
};

export default DailyTasksHeader;