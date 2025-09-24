import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { X, Play, Pause, CheckCircle2, Edit, Target, ListTodo, Sparkles } from 'lucide-react';
import { useTasks, Task, TaskSection, Category } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import FocusToolsPanel from '@/components/FocusToolsPanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import MiniBreathingBubble from '@/components/MiniBreathingBubble';

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const {
    tasks,
    filteredTasks,
    loading,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    nextAvailableTask,
    setFocusTask,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    handleAddTask,
  } = useTasks({ currentDate: new Date(), viewMode: 'focus', userId: demoUserId });
  const { settings, updateSettings } = useSettings({ userId: demoUserId });

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false); // For mobile drawer

  const focusedTask = useMemo(() => {
    if (settings?.focused_task_id) {
      return tasks.find(t => t.id === settings.focused_task_id);
    }
    return nextAvailableTask;
  }, [settings?.focused_task_id, tasks, nextAvailableTask]);

  useEffect(() => {
    if (focusedTask && focusedTask.status !== 'to-do') {
      setFocusTask(null); // Clear focus if task is no longer 'to-do'
    }
  }, [focusedTask, setFocusTask]);

  const handleMarkDone = async () => {
    if (focusedTask) {
      await updateTask(focusedTask.id, { status: 'completed' });
      setIsFullScreenFocus(false);
      setFocusTask(null);
    }
  };

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handlePanelResize = (sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  };

  const defaultLayout = settings?.dashboard_panel_sizes || [70, 30];

  if (isFullScreenFocus && focusedTask) {
    return (
      <FullScreenFocusView
        taskDescription={focusedTask.description}
        onClose={() => setIsFullScreenFocus(false)}
        onMarkDone={handleMarkDone}
      />
    );
  }

  const renderContent = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
      {loading ? (
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      ) : focusedTask ? (
        <div className="space-y-6">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            {focusedTask.description}
          </h2>
          <div className="flex space-x-4">
            <Button size="lg" onClick={() => setIsFullScreenFocus(true)} className="h-14 px-8 text-lg">
              <Play className="mr-2 h-6 w-6" /> Start Focus
            </Button>
            <Button size="lg" variant="outline" onClick={() => handleOpenTaskOverview(focusedTask)} className="h-14 px-8 text-lg">
              <Edit className="mr-2 h-6 w-6" /> Details
            </Button>
          </div>
          <Button variant="ghost" onClick={() => setFocusTask(null)} className="text-muted-foreground">
            <X className="mr-2 h-4 w-4" /> Clear Focus
          </Button>
        </div>
      ) : (
        <div className="text-center text-muted-foreground space-y-4">
          <Target className="h-16 w-16 mx-auto text-primary" />
          <h2 className="text-2xl font-bold">No Task Focused</h2>
          <p className="text-lg">Select a task from your daily list or the panel to focus.</p>
          <Button onClick={() => navigate('/daily-tasks')}>
            Go to Daily Tasks
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6 container mx-auto max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Target className="h-7 w-7 text-primary" /> Focus Mode
        </h1>
        {isMobile ? (
          <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Sparkles className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
              <SheetHeader>
                <SheetTitle>Focus Tools</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto py-4">
                <FocusToolsPanel
                  nextAvailableTask={nextAvailableTask}
                  tasks={tasks}
                  filteredTasks={filteredTasks}
                  updateTask={updateTask}
                  onOpenDetail={handleOpenTaskOverview}
                  onDeleteTask={deleteTask}
                  sections={sections}
                  allCategories={allCategories}
                  handleAddTask={handleAddTask}
                  currentDate={new Date()}
                />
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Button onClick={() => setIsPanelOpen(true)} variant="outline">
            <Sparkles className="mr-2 h-4 w-4" /> Open Focus Tools
          </Button>
        )}
      </div>

      {isMobile ? (
        renderContent()
      ) : (
        <ResizablePanelGroup direction="horizontal" className="w-full min-h-[calc(100vh-180px)] rounded-xl border">
          <ResizablePanel defaultSize={defaultLayout[0]} minSize={50}>
            {renderContent()}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={defaultLayout[1]} minSize={20} onCollapse={() => setIsPanelOpen(false)} onExpand={() => setIsPanelOpen(true)}>
            <div className="h-full flex flex-col p-4 overflow-y-auto">
              <FocusToolsPanel
                nextAvailableTask={nextAvailableTask}
                tasks={tasks}
                filteredTasks={filteredTasks}
                updateTask={updateTask}
                onOpenDetail={handleOpenTaskOverview}
                onDeleteTask={deleteTask}
                sections={sections}
                allCategories={allCategories}
                handleAddTask={handleAddTask}
                currentDate={new Date()}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      <TaskOverviewDialog
        task={taskToOverview}
        isOpen={isTaskOverviewOpen}
        onClose={() => setIsTaskOverviewOpen(false)}
        onEditClick={handleEditTaskFromOverview}
        onUpdate={updateTask}
        onDelete={deleteTask}
        sections={sections}
        allCategories={allCategories}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        allTasks={tasks}
      />
    </main>
  );
};

export default FocusMode;