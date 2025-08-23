import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDailyTasks } from '@/hooks/useDailyTasks';
import { Task } from '@/types';
import TaskSection from '@/components/TaskSection';
// import { toast } from 'react-hot-toast'; // Removed unused import
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client'; // Added supabase import

interface DailyTasksV3Props {
  isDemo?: boolean;
  demoUserId?: string;
}

const DailyTasksV3: React.FC<DailyTasksV3Props> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const {
    tasks,
    sections,
    categories,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    toggleFocusMode,
    logDoTodayOff,
  } = useDailyTasks(user?.id, isDemo, demoUserId);

  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentUserId = isDemo ? demoUserId : user?.id;

  useEffect(() => {
    const fetchFocusedTask = async () => {
      if (currentUserId) {
        const { data, error } = await supabase
          .from('user_settings')
          .select('focused_task_id')
          .eq('user_id', currentUserId)
          .single();
        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error('Error fetching focused task:', error.message);
        }
        setFocusedTaskId(data?.focused_task_id || null);
      }
    };
    fetchFocusedTask();
  }, [currentUserId]);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.stopPropagation();
    setIsDragging(true);
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetSectionId: string | null, targetParentTaskId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!draggedTask || draggedTask.id === targetParentTaskId) {
      setDraggedTask(null);
      return;
    }

    const droppedTaskId = draggedTask.id;
    const currentTasksInTarget = tasks.filter(
      t => t.section_id === targetSectionId && t.parent_task_id === targetParentTaskId
    ).sort((a, b) => (a.order || 0) - (b.order || 0));

    let newOrder = 0;
    if (currentTasksInTarget.length > 0) {
      newOrder = (currentTasksInTarget[currentTasksInTarget.length - 1].order || 0) + 1;
    }

    const updates = [{
      id: droppedTaskId,
      order: newOrder,
      parent_task_id: targetParentTaskId,
      section_id: targetSectionId,
    }];

    await reorderTasks(updates);
    setDraggedTask(null);
  };

  const handleToggleFocusMode = async (taskId: string, isFocused: boolean) => {
    await toggleFocusMode(taskId, isFocused);
    setFocusedTaskId(isFocused ? taskId : null);
  };

  const handleLogDoTodayOff = async (taskId: string) => {
    await logDoTodayOff(taskId);
    await updateTask(taskId, { section_id: null }); // Move task out of any section
  };

  const goToPreviousDay = () => setCurrentDate(prev => subDays(prev, 1));
  const goToNextDay = () => setCurrentDate(prev => addDays(prev, 1));
  const goToToday = () => setCurrentDate(new Date());

  const filteredTasks = tasks.filter(task => {
    if (task.section_id) {
      // Tasks in sections are always shown
      return true;
    }
    // For tasks not in a section, check if they are due today
    return task.due_date && isSameDay(new Date(task.due_date), currentDate);
  });

  if (loading) return <div className="p-4 text-center">Loading tasks...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Daily Tasks</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            {isSameDay(currentDate, new Date()) ? 'Today' : format(currentDate, 'MMM dd, yyyy')}
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextDay}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => (
          <TaskSection
            key={section.id}
            section={section}
            tasks={filteredTasks}
            categories={categories}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onAddSubtask={(description, parentTaskId) => addTask(description, section.id, parentTaskId)}
            onToggleFocusMode={handleToggleFocusMode}
            onLogDoTodayOff={handleLogDoTodayOff}
            focusedTaskId={focusedTaskId}
            isDragging={isDragging}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
};

export default DailyTasksV3;