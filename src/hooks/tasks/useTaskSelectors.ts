import { useMemo } from 'react';
import { isSameDay, parseISO, isValid, isBefore, startOfDay } from 'date-fns';
import { Task, TaskSection, DailyProgress } from './types';
import { UserSettings } from '@/hooks/useUserSettings';

interface UseNextAvailableTaskProps {
  processedTasks: Task[];
  sections: TaskSection[];
  userSettings: UserSettings | null;
  doTodayOffIds: Set<string>;
}

export const useNextAvailableTask = ({ processedTasks, sections, userSettings, doTodayOffIds }: UseNextAvailableTaskProps): Task | null => {
  return useMemo(() => {
    const focusedTaskId = userSettings?.focused_task_id;
    if (focusedTaskId) {
      const focusedTask = processedTasks.find(t => t.id === focusedTaskId);
      if (focusedTask && focusedTask.status === 'to-do' && (focusedTask.recurring_type !== 'none' || !doTodayOffIds.has(focusedTask.original_task_id || focusedTask.id))) {
        return focusedTask;
      }
    }

    const relevantTasks = processedTasks.filter(task =>
      task.status === 'to-do' &&
      task.parent_task_id === null &&
      (task.recurring_type !== 'none' || !doTodayOffIds.has(task.original_task_id || task.id))
    );

    const tasksBySection = new Map<string | null, Task[]>();
    relevantTasks.forEach(task => {
      const sectionId = task.section_id || null;
      if (!tasksBySection.has(sectionId)) {
        tasksBySection.set(sectionId, []);
      }
      tasksBySection.get(sectionId)!.push(task);
    });

    tasksBySection.forEach((tasksInSection) => {
      tasksInSection.sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    for (const section of sections) {
      const tasksInSection = tasksBySection.get(section.id);
      if (tasksInSection && tasksInSection.length > 0) {
        return tasksInSection[0];
      }
    }

    const tasksInNoSection = tasksBySection.get(null);
    if (tasksInNoSection && tasksInNoSection.length > 0) {
      return tasksInNoSection[0];
    }

    return null;
  }, [processedTasks, sections, userSettings?.focused_task_id, doTodayOffIds]);
};

interface UseDailyProgressProps {
  processedTasks: Task[];
  viewMode: 'daily' | 'archive' | 'focus';
  sections: TaskSection[];
  doTodayOffIds: Set<string>;
  todayStart: Date;
}

export const useDailyProgress = ({ processedTasks, viewMode, sections, doTodayOffIds, todayStart }: UseDailyProgressProps): DailyProgress => {
  return useMemo(() => {
    if (viewMode !== 'daily') {
      return { totalCount: 0, completedCount: 0, overdueCount: 0 };
    }

    const tasksForToday = processedTasks.filter(task => {
        // Condition 1: Was completed or archived today
        if ((task.status === 'completed' || task.status === 'archived') && task.updated_at) {
            const updatedAt = startOfDay(parseISO(task.updated_at));
            if (isSameDay(updatedAt, todayStart)) {
                return true;
            }
        }

        // Condition 2: Is a relevant 'to-do' task
        if (task.status === 'to-do') {
            const createdAt = startOfDay(parseISO(task.created_at));
            const dueDate = task.due_date ? startOfDay(parseISO(task.due_date)) : null;

            // Due on or before today
            if (dueDate && !isBefore(dueDate, todayStart)) { // Changed to !isBefore to include today
                return true;
            }
            
            // No due date, created on or before today
            if (!dueDate && !isBefore(createdAt, todayStart)) { // Changed to !isBefore to include today
                return true;
            }
        }

        return false;
    });

    const focusModeSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));

    const focusTasks = tasksForToday.filter(t => {
      if (t.parent_task_id !== null) return false; // Only top-level tasks

      const isInFocusArea = t.section_id === null || focusModeSectionIds.has(t.section_id);
      const isDoToday = t.recurring_type !== 'none' || !doTodayOffIds.has(t.original_task_id || t.id);

      return isInFocusArea && isDoToday;
    });

    const completedCount = focusTasks.filter(t => t.status === 'completed' || t.status === 'archived').length;
    const totalCount = focusTasks.filter(t => t.status !== 'skipped').length;
    
    const overdueCount = focusTasks.filter(t => {
      if (!t.due_date || t.status === 'completed' || t.status === 'archived') return false;
      const due = parseISO(t.due_date);
      return isValid(due) && isBefore(startOfDay(due), startOfDay(todayStart));
    }).length;

    return { totalCount, completedCount, overdueCount };
  }, [processedTasks, viewMode, sections, doTodayOffIds, todayStart]);
};