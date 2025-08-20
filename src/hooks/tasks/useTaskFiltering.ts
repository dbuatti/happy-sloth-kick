import { useState, useMemo } from 'react';
import { isAfter, parseISO, startOfDay, addDays, isSameDay } from 'date-fns';
import { Task, TaskFilteringState, TaskFilteringSetters, UseTasksOptions } from './types';
import { UserSettings } from '@/hooks/useUserSettings';

interface UseTaskFilteringProps {
  processedTasks: Task[];
  userSettings: UserSettings | null;
  options: UseTasksOptions;
  doTodayOffIds: Set<string>;
}

export const useTaskFiltering = ({ processedTasks, userSettings, options, doTodayOffIds }: UseTaskFilteringProps) => {
  const { currentDate, viewMode } = options;
  const todayStart = startOfDay(currentDate);

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const filteringState: TaskFilteringState = {
    searchFilter,
    statusFilter,
    categoryFilter,
    priorityFilter,
    sectionFilter,
  };

  const filteringSetters: TaskFilteringSetters = {
    setSearchFilter,
    setStatusFilter,
    setCategoryFilter,
    setPriorityFilter,
    setSectionFilter,
  };

  const filteredTasks = useMemo(() => {
    let filtered = processedTasks;

    if (viewMode === 'daily') {
      filtered = filtered.filter(task => {
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
            if (dueDate && !isAfter(dueDate, todayStart)) {
                return true;
            }
            
            // No due date, created on or before today
            if (!dueDate && !isAfter(createdAt, todayStart)) {
                return true;
            }
        }

        return false;
      });
    }

    if (searchFilter) {
      filtered = filtered.filter(task =>
        task.description?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.link?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    if (viewMode === 'archive') {
      filtered = filtered.filter(task => task.status === 'archived');
    } else {
      if (statusFilter !== 'all') {
        filtered = filtered.filter(task => task.status === statusFilter);
      } else {
        filtered = filtered.filter(task => task.status !== 'archived');
      }
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(task => task.category === categoryFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    if (sectionFilter !== 'all') {
      if (sectionFilter === 'no-section') {
        filtered = filtered.filter(task => task.section_id === null);
      } else {
        filtered = filtered.filter(task => task.section_id === sectionFilter);
      }
    }

    if (userSettings && userSettings.future_tasks_days_visible !== -1 && viewMode === 'daily') {
      const visibilityDays = userSettings.future_tasks_days_visible;
      const today = startOfDay(currentDate);
      const futureLimit = addDays(today, visibilityDays);

      filtered = filtered.filter(task => {
        if (!task.due_date) {
          return true; // Always show tasks without a due date
        }
        const dueDate = startOfDay(parseISO(task.due_date));
        // Show if due date is today or in the past, or within the visibility window
        return !isAfter(dueDate, futureLimit);
      });
    }

    return filtered;
  }, [
    processedTasks,
    searchFilter,
    statusFilter,
    categoryFilter,
    priorityFilter,
    sectionFilter,
    viewMode,
    currentDate,
    userSettings,
    todayStart,
  ]);

  return {
    filteredTasks,
    filteringState,
    filteringSetters,
  };
};