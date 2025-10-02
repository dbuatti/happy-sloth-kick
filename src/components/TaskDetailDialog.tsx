"use client";

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
import TaskForm from './TaskForm';
import { Trash2, PlusCircle } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';
import { Separator } from '@/components/ui/separator';
import TaskList from './TaskList';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useReminders } from '@/context/ReminderContext';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';
import { useTaskProcessing } from '@/hooks/useTaskProcessing';
import { toggleDoTodayMutation } from '@/integrations/supabase/taskMutations';
import { format } from 'date-fns';
import { showError } from '@/utils/toast';

interface TaskDetailDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onDelete: (taskId: string) => Promise<boolean | undefined>;
  sections: TaskSection[];
  allCategories: Category[];
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  allTasks: Task[]; // All tasks for subtask filtering
  onAddSubtask: (parentTaskId: string | null, sectionId: string | null) => void;
  createCategory: (name: string, color: string) => Promise<string | null>;
  updateCategory: (categoryId: string, updates: Partial<Category>) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  onOpenOverview: (task: Task) => void; // Added onOpenOverview prop
}

const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  sections,
  allCategories,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  allTasks,
  onAddSubtask,
  createCategory,
  updateCategory,
  deleteCategory,
  onOpenOverview, // Destructure onOpenOverview
}) => {
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const { user } = useAuth();
  const { settings: userSettings, updateSettings } = useSettings();
  const { scheduleReminder, cancelReminder } = useReminders();
  const queryClient = useQueryClient();
  const inFlightUpdatesRef = useRef<Set<string>>(new Set());

  const subtasks = useMemo(() => {
    return allTasks.filter(t => t.parent_task_id === task.id);
  }, [allTasks, task.id]);

  const doTodayOffIds = (queryClient.getQueryData(['do_today_off_log', user?.id, format(new Date(), 'yyyy-MM-dd')]) as Set<string>) || new Set();
  const recurringTaskCompletions = (queryClient.getQueryData(['recurring_task_completion_log', user?.id, format(new Date(), 'yyyy-MM-dd')]) as Set<string>) || new Set();

  const invalidateTasksQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['do_today_off_log', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['recurring_task_completion_log', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['dailyTaskCount', user?.id] });
  }, [queryClient, user?.id]);

  const categoriesMap = useMemo(() => {
    const map = new Map<string, string>();
    allCategories.forEach(c => map.set(c.id, c.color));
    return map;
  }, [allCategories]);

  const mutationContext = useMemo(() => ({
    userId: user?.id!,
    queryClient,
    inFlightUpdatesRef,
    categoriesMap,
    invalidateTasksQueries,
    invalidateSectionsQueries: () => {}, // Not directly used here
    invalidateCategoriesQueries: () => {}, // Not directly used here
    processedTasks: allTasks,
    rawTasks: allTasks, // Pass raw tasks for mutations
    sections,
    scheduleReminder,
    cancelReminder,
    currentDate: new Date(),
    doTodayOffIds: doTodayOffIds,
  }), [user?.id, queryClient, categoriesMap, invalidateTasksQueries, allTasks, sections, scheduleReminder, cancelReminder, doTodayOffIds]);

  const toggleDoToday = useCallback(async (taskToToggle: Task) => {
    if (!user?.id) { showError('User not authenticated.'); return; }
    await toggleDoTodayMutation(taskToToggle, new Date(), doTodayOffIds, mutationContext);
  }, [user?.id, doTodayOffIds, mutationContext]);

  const { filteredTasks: subtasksForList } = useTaskProcessing({
    rawTasks: subtasks,
    categoriesMap,
    effectiveCurrentDate: new Date(),
    viewMode: 'daily', // Subtasks are always shown in daily context
    searchFilter: '',
    statusFilter: 'all',
    categoryFilter: 'all',
    priorityFilter: 'all',
    sectionFilter: 'all',
    userSettings,
    sections,
    doTodayOffIds: doTodayOffIds,
    recurringTaskCompletions: recurringTaskCompletions,
  });

  const handleSave = async (taskData: NewTaskData) => {
    const result = await onUpdate(task.id, taskData);
    if (result) {
      onClose();
    }
    return result;
  };

  const handleDelete = async () => {
    const success = await onDelete(task.id);
    if (success) {
      onClose();
    }
  };

  const handleSetFocusTask = useCallback(async () => {
    await updateSettings({ focused_task_id: task.id });
    onClose();
  }, [task.id, updateSettings, onClose]);

  const handleRemoveFocusTask = useCallback(async () => {
    await updateSettings({ focused_task_id: null });
    onClose();
  }, [updateSettings, onClose]);

  const isFocused = userSettings?.focused_task_id === task.id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>View and edit the details of your task, or manage its subtasks.</DialogDescription>
        </DialogHeader>
        <TaskForm
          initialData={task}
          onSave={handleSave}
          onCancel={onClose}
          sections={sections}
          allCategories={allCategories}
          currentDate={new Date()}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          allTasks={allTasks}
          createCategory={createCategory}
          updateCategory={updateCategory}
          deleteCategory={deleteCategory}
        />

        <Separator className="my-4" />

        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Subtasks ({subtasks.length})</h3>
          <Button variant="outline" size="sm" onClick={() => onAddSubtask(task.id, task.section_id)}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add Subtask
          </Button>
        </div>

        {subtasks.length > 0 ? (
          <TaskList
            processedTasks={allTasks} // Pass all tasks for full context
            filteredTasks={subtasksForList} // Only show direct subtasks here
            loading={false} // Subtasks are already loaded
            updateTask={onUpdate}
            deleteTask={onDelete}
            markAllTasksInSectionCompleted={async () => {}} // Not applicable for subtasks
            sections={sections}
            createSection={createSection}
            updateTaskParentAndOrder={async () => {}} // Drag and drop not enabled in detail view
            onOpenOverview={onOpenOverview} // Pass onOpenOverview prop
            currentDate={new Date()}
            expandedSections={{}}
            expandedTasks={{}}
            toggleTask={() => {}}
            toggleSection={() => {}}
            setFocusTask={handleSetFocusTask}
            doTodayOffIds={doTodayOffIds}
            toggleDoToday={toggleDoToday}
            scheduledTasksMap={new Map()} // Not directly used here
            selectedTaskIds={new Set()}
            onSelectTask={() => {}}
            onOpenAddTaskDialog={onAddSubtask}
          />
        ) : (
          <p className="text-muted-foreground text-sm">No subtasks for this task yet.</p>
        )}

        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            onClick={isFocused ? handleRemoveFocusTask : handleSetFocusTask}
          >
            {isFocused ? 'Remove from Focus' : 'Set as Focus'}
          </Button>
          <Button variant="destructive" onClick={() => setIsConfirmDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete Task
          </Button>
        </div>

        <ConfirmationDialog
          isOpen={isConfirmDeleteOpen}
          onClose={() => setIsConfirmDeleteOpen(false)}
          onConfirm={handleDelete}
          title="Confirm Deletion"
          description="Are you sure you want to delete this task and all its subtasks? This action cannot be undone."
          confirmText="Delete"
          confirmVariant="destructive"
        />
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;