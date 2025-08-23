import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Task, TaskCategory, TaskSection } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay } from 'date-fns';

interface UseDailyTasksProps {
  userId?: string;
  date?: Date;
}

export const useDailyTasks = ({ userId: propUserId, date = new Date() }: UseDailyTasksProps) => {
  const { user } = useAuth();
  const currentUserId = propUserId || user?.id;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDailyTasks = async () => {
      if (!currentUserId) {
        setTasks([]);
        setSections([]);
        setCategories([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const formattedDate = format(startOfDay(date), 'yyyy-MM-dd');

        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*, task_categories(*)')
          .eq('user_id', currentUserId)
          .or(`due_date.eq.${formattedDate},due_date.is.null`)
          .order('order', { ascending: true });

        if (tasksError) throw tasksError;

        const { data: sectionsData, error: sectionsError } = await supabase
          .from('task_sections')
          .select('*')
          .eq('user_id', currentUserId)
          .order('order', { ascending: true });

        if (sectionsError) throw sectionsError;

        const { data: categoriesData, error: categoriesError } = await supabase
          .from('task_categories')
          .select('*')
          .eq('user_id', currentUserId)
          .order('name', { ascending: true });

        if (categoriesError) throw categoriesError;

        setTasks(tasksData.map(task => ({
          ...task,
          category: task.task_categories ? { id: task.task_categories.id, name: task.task_categories.name, color: task.task_categories.color, user_id: task.task_categories.user_id, created_at: task.task_categories.created_at } : null,
        })) as Task[]);
        setSections(sectionsData as TaskSection[]);
        setCategories(categoriesData as TaskCategory[]);
      } catch (err: any) {
        setError(err);
        console.error('Error fetching daily tasks:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDailyTasks();
  }, [currentUserId, date]);

  return { tasks, sections, categories, isLoading, error };
};