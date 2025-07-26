import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess, showReminder } from '@/utils/toast'; // Import showReminder
import { v4 as uuidv4 } from 'uuid';
import { isSameDay, isPast, startOfDay as fnsStartOfDay, parseISO } from 'date-fns'; // Import parseISO

export interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  created_at: string;
  user_id: string;
  category: string;
  priority: string;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number | null;
  original_task_id: string | null;
  parent_task_id: string | null; // New: for sub-tasks
}

export interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
}

type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>;

interface NewTaskData {
  description: string;
  status?: 'to-do' | 'completed' | 'skipped' | 'archiverd';
  recurring_type?: 'none' | 'daily' | 'weekly' | 'monthly';
  category?: string;
  priority?: string;
  due_date?: string | null;
  notes?: string | null;
  remind_at?: string | null;
  section_id?: string | null;
  parent_task_id?: string | null; // New: for sub-tasks
}

export const useTasks = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const [tasks, setTasks] = useState<Task[]>([]); // This will now hold ALL tasks for the user
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<'priority' | 'due_date' | 'created_at' | 'order'>('order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sections, setSections] = useState<TaskSection[]>([]);

  // Filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  // Ref to keep track of tasks for which a reminder has been shown in the current session
  const remindedTaskIdsRef = useRef<Set<string>>(new Set());

  const fetchSections = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('task_sections')
      .select('*')
      .eq('user_id', userId)
      .order('order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching sections:', error);
      showError('Failed to load sections.');
    } else {
      setSections(data || []);
    }
  }, [userId]);

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    try {
      const { data: fetchedTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      let allUserTasks: Task[] = fetchedTasks || [];

      // --- Recurring task generation logic ---
      const dailyRecurringTemplates = allUserTasks.filter(
        task => task.recurring_type === 'daily' && task.original_task_id === null
      );

      // This set will store the original_task_id (or task.id if it's a template)
      // for any task that is already present and should be considered for today's view.
      // This helps prevent generating new instances if one already exists for the template for today.
      const existingRelevantOriginalIdsForToday = new Set<string>();
      const startOfCurrentDate = fnsStartOfDay(currentDate);

      for (const task of allUserTasks) {
        const taskCreatedAt = parseISO(task.created_at);
        const taskDueDate = task.due_date ? parseISO(task.due_date) : null;
        const originalId = task.original_task_id || task.id;

        // A task is "relevant for today" if it's active (to-do/skipped) AND:
        // 1. Created today
        // 2. OR due today
        // 3. OR overdue
        // 4. OR undated and created before today
        // OR if it's completed TODAY (to prevent generating a new instance if user completed it today)
        const isRelevantAndActive = (task.status === 'to-do' || task.status === 'skipped') && (
          isSameDay(taskCreatedAt, currentDate) ||
          (taskDueDate && isSameDay(taskDueDate, currentDate)) ||
          (taskDueDate && isPast(taskDueDate) && !isSameDay(taskDueDate, currentDate)) ||
          (task.due_date === null && taskCreatedAt < startOfCurrentDate)
        );
        const isCompletedToday = task.status === 'completed' && isSameDay(taskCreatedAt, currentDate);

        if (isRelevantAndActive || isCompletedToday) {
          existingRelevantOriginalIdsForToday.add(originalId);
        }
      }

      const newRecurringInstances: Task[] = [];
      for (const template of dailyRecurringTemplates) {
        // Only generate a new instance if:
        // 1. The template itself was created before today (i.e., it's an old template)
        // 2. AND no task (template or instance) related to this template's ID
        //    is already marked as "relevant for today" in existingRelevantOriginalIdsForToday.
        if (parseISO(template.created_at) < startOfCurrentDate && !existingRelevantOriginalIdsForToday.has(template.id)) {
          const newInstance: Task = {
            ...template,
            id: uuidv4(),
            created_at: currentDate.toISOString(), // Set created_at to current date for the instance
            status: 'to-do', // New instances always start as to-do
            recurring_type: 'none', // New instances are not recurring themselves
            original_task_id: template.id, // Link to the original template
            order: template.order,
            // For daily recurring, due_date and remind_at should typically be null or relative to the new instance's date.
            // Setting them to null here ensures they don't carry over old specific dates.
            due_date: null, 
            remind_at: null,
            parent_task_id: null, // New instances are top-level by default
          };
          newRecurringInstances.push(newInstance);
        }
      }

      if (newRecurringInstances.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('tasks')
          .insert(newRecurringInstances)
          .select();

        if (insertError) {
          console.error('Error inserting recurring instance:', insertError);
          showError('Failed to generate a recurring task instance.');
        } else if (insertedData) {
          allUserTasks.push(...insertedData);
        }
      }
      
      setTasks(allUserTasks);
    } catch (error: any) {
      console.error('Error fetching or generating tasks:', error);
      showError('An unexpected error occurred while loading tasks.');
    } finally {
      setLoading(false);
    }
  }, [userId, currentDate]);

  useEffect(() => {
    fetchSections();
    fetchTasks();
  }, [fetchSections, fetchTasks]);

  // Reminder check effect
  useEffect(() => {
    if (!userId) return;

    const reminderInterval = setInterval(() => {
      const now = new Date();
      tasks.forEach(task => {
        if (task.remind_at && task.status === 'to-do' && !remindedTaskIdsRef.current.has(task.id)) {
          const reminderTime = parseISO(task.remind_at);
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // Consider a window for reminders
          
          // If reminderTime is in the past (or now) and within the last 5 minutes (to avoid old reminders)
          if (reminderTime <= now && reminderTime > fiveMinutesAgo) {
            showReminder(`Reminder: ${task.description}`, task.id);
            remindedTaskIdsRef.current.add(task.id);
          }
        }
      });
    }, 30 * 1000); // Check every 30 seconds

    return () => clearInterval(reminderInterval);
  }, [tasks, userId]); // Only tasks and userId are dependencies now

  const filteredTasks = useMemo(() => {
    let workingTasks = [...tasks];
    const startOfCurrentDate = fnsStartOfDay(currentDate);

    // Step 1: Determine the set of tasks to display for the current day, handling recurring logic.
    let dailyViewTasks: Task[] = [];
    if (statusFilter === 'all') { // Only apply this complex logic for the 'all' status view (daily view)
      const groupedTasks = new Map<string, Task[]>();
      for (const task of workingTasks) {
        const key = task.original_task_id || task.id;
        if (!groupedTasks.has(key)) {
          groupedTasks.set(key, []);
        }
        groupedTasks.get(key)!.push(task);
      }

      for (const [originalId, taskGroup] of groupedTasks.entries()) {
        // Sort tasks within the group to find the "most relevant" one for today's display
        // Prioritization:
        // 1. Active (to-do/skipped) tasks created today
        // 2. Active (to-do/skipped) tasks due today
        // 3. Active (to-do/skipped) overdue tasks
        // 4. Active (to-do/skipped) undated tasks created before today
        // 5. Completed tasks created today
        // 6. Other active tasks (e.g., future due dates)
        // 7. Other tasks (completed/skipped from previous days, templates not due today)
        taskGroup.sort((a, b) => {
          const aCreatedAt = parseISO(a.created_at);
          const bCreatedAt = parseISO(b.created_at);
          const aDueDate = a.due_date ? parseISO(a.due_date) : null;
          const bDueDate = b.due_date ? parseISO(b.due_date) : null;

          const aIsActive = a.status === 'to-do' || a.status === 'skipped';
          const bIsActive = b.status === 'to-do' || b.status === 'skipped';

          const aCreatedToday = isSameDay(aCreatedAt, currentDate);
          const bCreatedToday = isSameDay(bCreatedAt, currentDate);

          const aDueToday = aDueDate && isSameDay(aDueDate, currentDate);
          const bDueToday = bDueDate && isSameDay(bDueDate, currentDate);

          const aOverdue = aDueDate && isPast(aDueDate) && !isSameDay(aDueDate, currentDate);
          const bOverdue = bDueDate && isPast(bDueDate) && !isSameDay(bDueDate, currentDate);

          const aUndatedOldActive = aIsActive && a.due_date === null && aCreatedAt < startOfCurrentDate;
          const bUndatedOldActive = bIsActive && b.due_date === null && bCreatedAt < startOfCurrentDate;

          const aCompletedToday = a.status === 'completed' && isSameDay(aCreatedAt, currentDate);
          const bCompletedToday = b.status === 'completed' && isSameDay(bCreatedAt, currentDate);

          // Define a score for each task based on relevance to `currentDate`
          let scoreA = 0;
          if (aIsActive && aCreatedToday) scoreA += 1000;
          else if (aIsActive && aDueToday) scoreA += 900;
          else if (aIsActive && aOverdue) scoreA += 800;
          else if (aIsActive && aUndatedOldActive) scoreA += 700;
          else if (aCompletedToday) scoreA += 600;
          else if (aIsActive) scoreA += 500; // Any other active task (e.g., future due date)

          let scoreB = 0;
          if (bIsActive && bCreatedToday) scoreB += 1000;
          else if (bIsActive && bDueToday) scoreB += 900;
          else if (bIsActive && bOverdue) scoreB += 800;
          else if (bIsActive && bUndatedOldActive) scoreB += 700;
          else if (bCompletedToday) scoreB += 600;
          else if (bIsActive) scoreB += 500;

          if (scoreA !== scoreB) return scoreB - scoreA; // Higher score first

          // Secondary sort for tasks with same score: newest created_at first
          return bCreatedAt.getTime() - aCreatedAt.getTime();
        });

        const bestTask = taskGroup[0]; // The first task after sorting is the "best" candidate

        // Exclude templates from daily view unless they are explicitly due today and active
        if (bestTask.recurring_type !== 'none' && bestTask.original_task_id === null) {
          if (!(bestTask.due_date && isSameDay(parseISO(bestTask.due_date), currentDate) && (bestTask.status === 'to-do' || bestTask.status === 'skipped'))) {
            continue; // Skip this template
          }
        }

        // Include if it's not archived and meets any of the daily view criteria
        if (bestTask.status !== 'archived' && (
            isSameDay(parseISO(bestTask.created_at), currentDate) ||
            (bestTask.due_date && isSameDay(parseISO(bestTask.due_date), currentDate)) ||
            ((bestTask.status === 'to-do' || bestTask.status === 'skipped') && bestTask.due_date && isPast(parseISO(bestTask.due_date))) ||
            ((bestTask.status === 'to-do' || bestTask.status === 'skipped') && bestTask.due_date === null && parseISO(bestTask.created_at) < startOfCurrentDate)
        )) {
          dailyViewTasks.push(bestTask);
        }
      }
      workingTasks = dailyViewTasks; // Now `workingTasks` holds the correctly de-duplicated daily view tasks
    } else {
      // If statusFilter is not 'all', we just filter by status and exclude templates
      workingTasks = workingTasks.filter(task => 
        task.status === statusFilter && 
        !(task.recurring_type !== 'none' && task.original_task_id === null) // Exclude templates
      );
    }

    // Step 2: Apply search, category, priority, section filters
    if (searchFilter) {
      workingTasks = workingTasks.filter(task =>
        task.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }
    if (categoryFilter && categoryFilter !== 'all') {
      workingTasks = workingTasks.filter(task => task.category === categoryFilter);
    }
    if (priorityFilter && priorityFilter !== 'all') {
      workingTasks = workingTasks.filter(task => task.priority === priorityFilter);
    }
    if (sectionFilter && sectionFilter !== 'all') {
      workingTasks = workingTasks.filter(task => task.section_id === sectionFilter);
    }

    // Step 3: Apply user-selected sorting (this is the final sort for display order)
    if (sortKey === 'order') {
      workingTasks.sort((a, b) => {
        const orderA = a.order === null ? Infinity : a.order;
        const orderB = b.order === null ? Infinity : b.order;
        return sortDirection === 'asc' ? orderA - orderB : orderB - a.order;
      });
    } else if (sortKey === 'priority') {
      const priorityOrder: { [key: string]: number } = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1, 'none': 0 };
      workingTasks.sort((a, b) => {
        const valA = priorityOrder[a.priority] || 0;
        const valB = priorityOrder[b.priority] || 0;
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
    } else if (sortKey === 'due_date') {
      workingTasks.sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else if (sortKey === 'created_at') {
      workingTasks.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    return workingTasks;
  }, [tasks, currentDate, searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter, sortKey, sortDirection]);

  const handleAddTask = async (taskData: NewTaskData) => {
    if (!userId) {
      showError('User not authenticated.');
      return false; // Indicate failure
    }
    
    let targetSectionId = taskData.section_id;
    if (!targetSectionId && sections.length > 0) {
      targetSectionId = sections[0].id; // Default to the first available section
    } else if (!targetSectionId && sections.length === 0) {
      showError('Please create a section first before adding tasks.');
      return false; // Indicate failure
    }

    try {
      // Determine the highest order in the target section to place the new task at the end
      const targetSectionTasks = tasks.filter(t => t.section_id === targetSectionId);
      const maxOrder = targetSectionTasks.reduce((max, task) => Math.max(max, task.order || 0), -1);
      const newOrder = maxOrder + 1;

      // Generate ID before insert to set original_task_id if it's a recurring task
      const newTaskId = uuidv4();
      const taskToInsert = {
        id: newTaskId,
        description: taskData.description,
        user_id: userId,
        status: taskData.status || 'to-do',
        recurring_type: taskData.recurring_type || 'none',
        category: taskData.category || 'General',
        priority: taskData.priority || 'medium',
        due_date: taskData.due_date, // Use directly as it's already ISO string or null
        notes: taskData.notes || null,
        remind_at: taskData.remind_at, // Use directly as it's already ISO string or null
        section_id: targetSectionId,
        order: newOrder,
        original_task_id: taskData.recurring_type !== 'none' ? newTaskId : null, // Set original_task_id if recurring
        parent_task_id: taskData.parent_task_id || null, // New: Set parent_task_id
        // Do NOT explicitly set created_at here; let the database default handle it for accuracy
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskToInsert)
        .select();

      if (error) {
        console.error('Error adding task:', error);
        showError('Failed to add task.');
        return false;
      }
      if (data && data.length > 0) {
        // Instead of optimistically adding, re-fetch to ensure consistency with DB
        await fetchTasks(); 
        showSuccess('Task added successfully!');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Exception adding task:', err);
      showError('An unexpected error occurred while adding the task.');
      return false;
    }
  };

  const updateTask = async (taskId: string, updates: TaskUpdate) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('Error updating task:', error);
        showError(error.message);
        return;
      }
      if (data && data.length > 0) {
        setTasks(prevTasks =>
          prevTasks.map(task => (task.id === taskId ? { ...task, ...data[0] } : task))
        );
        showSuccess('Task updated successfully!');
      }
    } catch (err) {
      console.error('Exception updating task:', err);
      showError('An unexpected error occurred while updating the task.');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting task:', error);
        showError(error.message);
        return;
      }
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      showSuccess('Task deleted successfully!');
    } catch (err) {
      console.error('Exception deleting task:', err);
      showError('An unexpected error occurred while deleting the task.');
    }
  };

  const applyFilters = useCallback((filters: { search: string; status: string; category: string; priority: string; section: string }) => {
    setSearchFilter(filters.search);
    setStatusFilter(filters.status);
    setCategoryFilter(filters.category);
    setPriorityFilter(filters.priority);
    setSectionFilter(filters.section);
  }, []);

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const clearSelectedTasks = () => {
    setSelectedTaskIds([]);
  };

  const bulkUpdateTasks = async (updates: TaskUpdate, idsToUpdate?: string[]) => {
    const targetIds = idsToUpdate && idsToUpdate.length > 0 ? idsToUpdate : selectedTaskIds;
    if (!userId || targetIds.length === 0) {
      showError('No tasks selected for bulk update.');
      return;
    }
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .in('id', targetIds)
        .eq('user_id', userId);

      if (error) {
        console.error('Error bulk updating tasks:', error);
        showError(error.message);
        return;
      }
      showSuccess('Tasks updated successfully!');
      clearSelectedTasks(); // Clear any currently selected tasks
      fetchTasks(); // Re-fetch to ensure UI consistency
    } catch (err) {
      console.error('Exception bulk updating tasks:', err);
      showError('An unexpected error occurred during bulk update.');
    }
  };

  const createSection = async (name: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      // Determine the highest order for new section
      const maxOrder = sections.reduce((max, section) => Math.max(max, section.order || 0), -1);
      const newOrder = maxOrder + 1;

      const { data, error } = await supabase
        .from('task_sections')
        .insert({ name, user_id: userId, order: newOrder })
        .select();

      if (error) {
        console.error('Error creating section:', error);
        showError(error.message);
        return;
      }

      if (data && data.length > 0) {
        setSections(prevSections => [...prevSections, data[0]]);
        showSuccess('Section created successfully!');
      }
    } catch (err) {
      console.error('Exception creating section:', err);
      showError('An unexpected error occurred while creating the section.');
    }
  };

  const updateSection = async (sectionId: string, newName: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('task_sections')
        .update({ name: newName })
        .eq('id', sectionId)
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('Error updating section:', error);
        showError(error.message);
        return;
      }

      if (data && data.length > 0) {
        setSections(prevSections =>
          prevSections.map(sec =>
            sec.id === sectionId ? { ...sec, name: newName } : sec
          )
        );
        showSuccess('Section updated successfully!');
      } else {
        showError('Section not found or no changes applied.');
      }
    } catch (err: any) {
      console.error('Exception updating section:', err);
      showError('An unexpected error occurred while updating the section.');
    }
  };

  const deleteSection = async (sectionId: string, reassignToSectionId: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      // Update tasks that belong to this section to the new reassignToSectionId
      const { error: updateTasksError } = await supabase
        .from('tasks')
        .update({ section_id: reassignToSectionId })
        .eq('section_id', sectionId)
        .eq('user_id', userId);

      if (updateTasksError) {
        console.error('Error reassigning tasks from section:', updateTasksError);
        showError(updateTasksError.message);
        return;
      }

      // Then, delete the section
      const { error: deleteSectionError } = await supabase
        .from('task_sections')
        .delete()
        .eq('id', sectionId)
        .eq('user_id', userId);

      if (deleteSectionError) {
        console.error('Error deleting section:', deleteSectionError);
        showError(deleteSectionError.message);
        return;
      }

      setSections(prevSections => prevSections.filter(sec => sec.id !== sectionId));
      fetchTasks(); // Re-fetch tasks to update the UI with new section assignments

      showSuccess('Section deleted successfully and tasks reassigned!');
    } catch (err) {
      console.error('Exception deleting section:', err);
      showError('An unexpected error occurred while deleting the section.');
    }
  };

  const reorderTasksInSameSection = async (sectionId: string | null, startIndex: number, endIndex: number) => {
    if (!userId) return;

    // Optimistically update UI
    setTasks(prevTasks => {
      const newTasks = [...prevTasks];
      const sectionTasks = newTasks.filter(t => t.section_id === sectionId && t.parent_task_id === null) // Only top-level tasks
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      const [removed] = sectionTasks.splice(startIndex, 1);
      sectionTasks.splice(endIndex, 0, removed);

      // Re-assign order values for the affected section
      const updatedSectionTasks = sectionTasks.map((task, index) => ({
        ...task,
        order: index,
      }));

      // Merge back into the main tasks array
      return newTasks.map(task => {
        const updatedTask = updatedSectionTasks.find(t => t.id === task.id);
        return updatedTask || task;
      });
    });

    try {
      const sectionTasksToUpdate = tasks.filter(t => t.section_id === sectionId && t.parent_task_id === null) // Only top-level tasks
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      const result = Array.from(sectionTasksToUpdate);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);

      const updates = result.map((task, index) => ({
        ...task, // Include all existing task properties
        order: index,
        user_id: userId, // Ensure user_id is included for RLS
      }));

      const { error } = await supabase.from('tasks').upsert(updates, { onConflict: 'id' });
      if (error) {
        console.error('Error reordering tasks:', error);
        showError(error.message);
        fetchTasks(); // Revert to server state on error
        return;
      }
      showSuccess('Tasks reordered successfully!');
    } catch (err) {
      console.error('Exception reordering tasks:', err);
      showError('An unexpected error occurred while reordering the tasks.');
      fetchTasks(); // Revert to server state on error
    }
  };

  const moveTaskToNewSection = async (
    taskId: string,
    sourceSectionId: string | null,
    destinationSectionId: string | null,
    destinationIndex: number
  ) => {
    if (!userId) return;

    // Optimistically update UI
    setTasks(prevTasks => {
      const newTasks = [...prevTasks];
      
      const sourceTasks = newTasks.filter(t => t.section_id === sourceSectionId && t.parent_task_id === null) // Only top-level tasks
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const destinationTasks = newTasks.filter(t => t.section_id === destinationSectionId && t.parent_task_id === null) // Only top-level tasks
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const movedTask = sourceTasks.find(t => t.id === taskId);
      if (!movedTask) return prevTasks; // Should not happen

      // Remove from source section's list and re-index
      const newSourceTasks = sourceTasks.filter(t => t.id !== taskId).map((task, index) => ({
        ...task, // Preserve all original properties
        order: index,
      }));

      // Add to destination section's list at the correct index and re-index
      const tempNewDestinationTasks = Array.from(destinationTasks);
      tempNewDestinationTasks.splice(destinationIndex, 0, { ...movedTask, section_id: destinationSectionId });
      const newDestinationTasks = tempNewDestinationTasks.map((task, index) => ({
        ...task, // Preserve all original properties
        order: index,
        section_id: destinationSectionId, // Ensure section_id is updated for the moved task
      }));

      // Merge back into the main tasks array
      return newTasks.map(task => {
        if (task.id === taskId) {
          return { ...task, section_id: destinationSectionId, order: destinationIndex };
        }
        const updatedSourceTask = newSourceTasks.find(t => t.id === task.id);
        if (updatedSourceTask) return updatedSourceTask;
        const updatedDestTask = newDestinationTasks.find(t => t.id === task.id);
        if (updatedDestTask) return updatedDestTask;
        return task;
      });
    });

    try {
      // Fetch current state from DB to ensure accurate re-indexing for persistence
      const { data: currentDbTasks, error: dbFetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);
      
      if (dbFetchError) {
        console.error('Error fetching tasks for move operation:', dbFetchError);
        showError(dbFetchError.message);
        fetchTasks(); // Revert to server state on error
        return;
      }

      const dbSourceTasks = currentDbTasks.filter(t => t.section_id === sourceSectionId && t.parent_task_id === null) // Only top-level tasks
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const dbDestinationTasks = currentDbTasks.filter(t => t.section_id === destinationSectionId && t.parent_task_id === null) // Only top-level tasks
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const movedTaskFromDb = dbSourceTasks.find(t => t.id === taskId);
      if (!movedTaskFromDb) throw new Error('Moved task not found in source section in DB.');

      const newDbSourceTasks = dbSourceTasks.filter(t => t.id !== taskId).map((task, index) => ({
        ...task, // Include all existing task properties
        order: index,
        user_id: userId, // Ensure user_id is included for RLS
      }));

      const tempNewDbDestinationTasks = Array.from(dbDestinationTasks);
      tempNewDbDestinationTasks.splice(destinationIndex, 0, { ...movedTaskFromDb, section_id: destinationSectionId }); // Ensure section_id is updated for the moved task
      const newDbDestinationTasks = tempNewDbDestinationTasks.map((task, index) => ({
        ...task, // Include all existing task properties
        order: index,
        section_id: destinationSectionId, // Ensure section_id is updated for the moved task
        user_id: userId, // Ensure user_id is included for RLS
      }));

      const updates: Task[] = [ // Type this as Task[] since we're sending full task objects
        ...newDbSourceTasks,
        ...newDbDestinationTasks,
      ];

      const { error } = await supabase.from('tasks').upsert(updates, { onConflict: 'id' });
      if (error) {
        console.error('Error moving task:', error);
        showError(error.message);
        fetchTasks(); // Revert to server state on error
        return;
      }
      showSuccess('Task moved successfully!');
    } catch (err) {
      console.error('Exception moving task:', err);
      showError('An unexpected error occurred while moving the task.');
      fetchTasks(); // Revert to server state on error
    }
  };

  const reorderSections = async (startIndex: number, endIndex: number) => {
    if (!userId) return;

    // Optimistically update UI
    setSections(prevSections => {
      const newSections = Array.from(prevSections);
      const [removed] = newSections.splice(startIndex, 1);
      newSections.splice(endIndex, 0, removed);

      // Re-assign order values
      return newSections.map((section, index) => ({
        ...section,
        order: index,
      }));
    });

    try {
      const sectionsToUpdate = Array.from(sections);
      const [removed] = sectionsToUpdate.splice(startIndex, 1);
      sectionsToUpdate.splice(endIndex, 0, removed);

      const updates = sectionsToUpdate.map((section, index) => ({
        id: section.id,
        name: section.name, // Include the name to prevent null constraint violation
        order: index,
        user_id: userId, // IMPORTANT: Include user_id for RLS policy check
      }));

      const { error } = await supabase.from('task_sections').upsert(updates, { onConflict: 'id' });
      if (error) {
        console.error('Error reordering sections:', error);
        showError(error.message);
        fetchSections(); // Revert to server state on error
        return;
      }
      showSuccess('Sections reordered successfully!');
    } catch (err) {
      console.error('Exception reordering sections:', err);
      showError('An unexpected error occurred while reordering sections.');
      fetchSections(); // Revert to server state on error
    }
  };

  return {
    tasks,
    filteredTasks,
    loading,
    currentDate,
    setCurrentDate,
    userId,
    handleAddTask,
    updateTask,
    deleteTask,
    applyFilters,
    searchFilter,
    statusFilter,
    categoryFilter,
    priorityFilter,
    sectionFilter,
    setSearchFilter,
    setStatusFilter,
    setCategoryFilter,
    setPriorityFilter,
    setSectionFilter,
    selectedTaskIds,
    toggleTaskSelection,
    clearSelectedTasks,
    bulkUpdateTasks,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    sections,
    createSection,
    updateSection,
    deleteSection,
    reorderTasksInSameSection,
    moveTaskToNewSection,
    reorderSections,
  };
};