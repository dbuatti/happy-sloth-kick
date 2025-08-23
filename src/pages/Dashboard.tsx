import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useAppointments } from '@/hooks/useAppointments';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useSettings } from '@/context/SettingsContext';
import { Task, TaskCategory, TaskSection, Appointment, CustomCard, WeeklyFocus, NewTaskData, UpdateTaskData, NewCustomCardData, UpdateCustomCardData, DashboardProps, Json } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X, Save, LayoutDashboard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import NextTaskCard from '@/components/dashboard/NextTaskCard';
import QuickLinks from '@/components/dashboard/QuickLinks';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotes from '@/components/dashboard/MeditationNotes';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import { ResponsiveGridLayout } from '@/components/ui/responsive-grid-layout';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import AddTaskForm from '@/components/AddTaskForm';
import TaskList from '@/components/TaskList';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import { toast } from 'react-hot-toast';
import { format, startOfDay } from 'date-fns';

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const { settings, updateSettings } = useSettings();

  const today = startOfDay(new Date());

  const {
    tasks,
    categories: fetchedCategories,
    sections: fetchedSections,
    isLoading: tasksLoading,
    error: tasksError,
    addTask,
    updateTask,
    deleteTask,
    onToggleFocusMode,
    onLogDoTodayOff,
    createCategory,
    updateCategory,
    deleteCategory,
    addSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    doTodayOffLog,
  } = useTasks({ userId: currentUserId, isDemo, demoUserId });

  const {
    appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments({ userId: currentUserId, date: today });

  const {
    customCards,
    isLoadingCards,
    cardsError,
    addCustomCard,
    updateCustomCard,
    deleteCustomCard,
    weeklyFocus,
    isLoadingWeeklyFocus,
    weeklyFocusError,
    updateWeeklyFocus,
    updateDashboardLayout,
  } = useDashboardData({ userId: currentUserId });

  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleAddTask = async (description: string, sectionId: string | null, parentTaskId: string | null, dueDate: Date | null, categoryId: string | null, priority: string) => {
    try {
      const data = await addTask({
        description,
        section_id: sectionId,
        parent_task_id: parentTaskId,
        due_date: dueDate ? dueDate.toISOString() : null,
        category: categoryId,
        priority: priority as Task['priority'],
        status: 'to-do',
      });
      if (data) {
        toast.success('Task added successfully!');
        setIsAddTaskDialogOpen(false);
      }
    } catch (error: any) {
      toast.error('Failed to add task: ' + error.message);
      console.error('Error adding task:', error);
    }
  };

  const onUpdateTask = async (id: string, updates: UpdateTaskData) => {
    try {
      const data = await updateTask({ id, updates });
      if (data) {
        toast.success('Task updated successfully!');
        return data;
      }
      return data;
    } catch (error: any) {
      toast.error('Failed to update task: ' + error.message);
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const handleAddSubtask = async (description: string, parentTaskId: string | null) => {
    try {
      const data = await addTask({
        description,
        parent_task_id: parentTaskId,
        status: 'to-do',
        priority: 'medium',
      });
      if (data) {
        toast.success('Subtask added successfully!');
        return data;
      }
      return data;
    } catch (error: any) {
      toast.error('Failed to add subtask: ' + error.message);
      console.error('Error adding subtask:', error);
      throw error;
    }
  };

  const handleToggleFocusMode = async (taskId: string, isFocused: boolean) => {
    await onToggleFocusMode(taskId, isFocused);
  };

  const handleLogDoTodayOff = async (taskId: string) => {
    await onLogDoTodayOff(taskId);
  };

  const handleNewTaskFormSubmit = async (description: string, sectionId: string | null, parentTaskId: string | null, dueDate: Date | null, categoryId: string | null, priority: string) => {
    await addTask({
      description,
      section_id: sectionId,
      parent_task_id: parentTaskId,
      due_date: dueDate ? dueDate.toISOString() : null,
      category: categoryId,
      priority: priority as Task['priority'],
      status: 'to-do',
    });
    setIsAddTaskDialogOpen(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over || active.id === over.id) return;

    const oldIndex = customCards.findIndex(card => card.id === active.id);
    const newIndex = customCards.findIndex(card => card.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(customCards, oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData(['customCards', currentUserId], newOrder);

    try {
      // Update card_order in database
      await Promise.all(newOrder.map((card, index) =>
        updateCustomCard({ id: card.id, updates: { card_order: index } })
      ));
      toast.success('Cards reordered!');
    } catch (error) {
      toast.error('Failed to reorder cards.');
      queryClient.invalidateQueries({ queryKey: ['customCards', currentUserId] }); // Rollback on error
      console.error('Error reordering cards:', error);
    }
  };

  const layout = settings?.dashboard_layout as Layout[] || customCards?.map((card, index) => ({
    i: card.id,
    x: (index * 2) % 12, // Simple layout for new cards
    y: Infinity, // Puts it at the bottom
    w: 4,
    h: 6,
    minW: 2,
    minH: 3,
  })) || [];

  const handleLayoutChange = (currentLayout: Layout[]) => {
    const newLayout = currentLayout.map(item => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    }));
    updateDashboardLayout(newLayout as Json);
  };

  if (authLoading || tasksLoading || appointmentsLoading || isLoadingCards || isLoadingWeeklyFocus || settings.isLoading) {
    return <div className="p-4 text-center">Loading dashboard...</div>;
  }

  if (tasksError || appointmentsError || cardsError || weeklyFocusError || settings.error) {
    return <div className="p-4 text-red-500">Error loading data: {tasksError?.message || appointmentsError?.message || cardsError?.message || weeklyFocusError?.message || settings.error?.message}</div>;
  }

  const visibleCards = customCards.filter(card => card.is_visible ?? true);

  const renderCard = (card: CustomCard) => {
    switch (card.title) {
      case 'Daily Schedule':
        return <DailySchedulePreview appointments={appointments} isLoading={appointmentsLoading} error={appointmentsError} />;
      case 'Next Task':
        return <NextTaskCard tasks={tasks} onUpdateTask={onUpdateTask} onDeleteTask={deleteTask} onToggleFocusMode={onToggleFocusMode} onLogDoTodayOff={onLogDoTodayOff} />;
      case 'Quick Links':
        return <QuickLinks isDemo={isDemo} demoUserId={demoUserId} />;
      case 'People Memory':
        return <PeopleMemoryCard isDemo={isDemo} demoUserId={demoUserId} />;
      case 'Meditation Notes':
        return <MeditationNotes isDemo={isDemo} demoUserId={demoUserId} />;
      case 'Weekly Focus':
        return (
          <WeeklyFocusCard
            weeklyFocus={weeklyFocus}
            updateWeeklyFocus={updateWeeklyFocus}
            primaryFocus={weeklyFocus?.primary_focus || ''}
            secondaryFocus={weeklyFocus?.secondary_focus || ''}
            tertiaryFocus={weeklyFocus?.tertiary_focus || ''}
            setPrimaryFocus={(value: string) => updateWeeklyFocus({ primary_focus: value })}
            setSecondaryFocus={(value: string) => updateWeeklyFocus({ secondary_focus: value })}
            setTertiaryFocus={(value: string) => updateWeeklyFocus({ tertiary_focus: value })}
          />
        );
      case 'Task List':
        return (
          <TaskList
            tasks={tasks || []}
            categories={fetchedCategories || []}
            sections={fetchedSections || []}
            onUpdateTask={onUpdateTask}
            onDeleteTask={deleteTask}
            onAddTask={handleAddTask}
            onAddSubtask={handleAddSubtask}
            onToggleFocusMode={onToggleFocusMode}
            onLogDoTodayOff={onLogDoTodayOff}
            createCategory={createCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
            createSection={addSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            showCompleted={settings?.visible_pages?.show_completed_tasks ?? false}
            doTodayOffLog={doTodayOffLog}
          />
        );
      default:
        return (
          <SortableCustomCard
            key={card.id}
            id={card.id}
            card={card}
            onSave={updateCustomCard}
            onDelete={deleteCustomCard}
          />
        );
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <AddTaskForm
                onAddTask={handleNewTaskFormSubmit}
                categories={fetchedCategories || []}
                sections={fetchedSections || []}
                currentDate={today}
                createSection={addSection}
                updateSection={updateSection}
                deleteSection={deleteSection}
                updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                showCompleted={false}
                onClose={() => setIsAddTaskDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={isLayoutSettingsOpen} onOpenChange={setIsLayoutSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <LayoutDashboard className="mr-2 h-4 w-4" /> Manage Layout
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Dashboard Layout Settings</DialogTitle>
              </DialogHeader>
              <DashboardLayoutSettings
                settings={settings}
                updateSettings={updateSettings}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleCards.map(card => card.id)} strategy={verticalListSortingStrategy}>
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: layout }}
            onLayoutChange={(currentLayout) => handleLayoutChange(currentLayout)}
            rowHeight={30}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            isDraggable={true}
            isResizable={true}
            compactType="vertical"
            preventCollision={false}
          >
            {visibleCards.map((card) => (
              <div key={card.id} data-grid={{ i: card.id, x: 0, y: 0, w: 4, h: 6 }}>
                {renderCard(card)}
              </div>
            ))}
          </ResponsiveGridLayout>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default Dashboard;