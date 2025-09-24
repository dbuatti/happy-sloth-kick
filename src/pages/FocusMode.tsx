import React, { useState, useMemo } from 'react'; // Removed useEffect
import { Button } from '@/components/ui/button';
import { Edit, Target, Sparkles } from 'lucide-react'; // Removed X, Play, Pause, CheckCircle2, ListTodo
import { useTasks, Task } from '@/hooks/useTasks'; // Removed TaskSection, Category
import { useSettings } from '@/context/SettingsContext';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import FocusToolsPanel from '@/components/FocusToolsPanel';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils'; // Added cn import
import { useNavigate } from 'react-router-dom';

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const navigate = useNavigate();

  const {
    tasks, // rawTasks
    processedTasks, // tasks with category_color and virtual tasks
    filteredTasks,
    nextAvailableTask,
    loading,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    handleAddTask,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    setFocusTask,
  } = useTasks({ currentDate: new Date(), viewMode: 'focus', userId: demoUserId });
  const { settings, updateSettings } = useSettings({ userId: demoUserId }); // Correct usage of useSettings

  const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const handleOpenFullScreenFocus = () => {
    if (nextAvailableTask) {
      setIsFullScreenFocus(true);
    }
  };

  const handleCloseFullScreenFocus = () => {
    setIsFullScreenFocus(false);
  };

  const handleMarkFocusedTaskDone = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      setIsFullScreenFocus(false);
      setFocusTask(null); // Clear focus after completion
    }
  };

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setIsTaskOverviewOpen(false);
    onOpenDetail(task); // This will open the TaskForm for editing
  };

  const onOpenDetail = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handlePanelResize = (sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  };

  const panelSizes = settings?.dashboard_panel_sizes || [66, 34];

  if (isFullScreenFocus && nextAvailableTask) {
    return (
      <FullScreenFocusView
        taskDescription={nextAvailableTask.description}
        onClose={handleCloseFullScreenFocus}
        onMarkDone={handleMarkFocusedTaskDone}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="max-w-6xl mx-auto h-full">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-center mb-8">
          <Target className="inline-block h-10 w-10 mr-3 text-primary" /> Focus Mode
        </h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ResizablePanelGroup
            direction="horizontal"
            className="min-h-[calc(100vh-15rem)] rounded-xl border"
            onLayout={handlePanelResize}
          >
            <ResizablePanel defaultSize={panelSizes[0]} minSize={30}>
              <div className="flex h-full items-center justify-center p-6">
                {nextAvailableTask ? (
                  <div className="flex flex-col items-center text-center space-y-6">
                    <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground">
                      {nextAvailableTask.description}
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-prose">
                      {nextAvailableTask.notes || "Time to focus on this task!"}
                    </p>
                    <div className="flex space-x-4">
                      <Button size="lg" onClick={handleOpenFullScreenFocus} className="h-14 px-8 text-lg">
                        <Sparkles className="mr-2 h-6 w-6" /> Go Fullscreen
                      </Button>
                      <Button size="lg" variant="outline" onClick={() => handleOpenTaskOverview(nextAvailableTask)} className="h-14 px-8 text-lg">
                        <Edit className="mr-2 h-6 w-6" /> Details
                      </Button>
                    </div>
                    <Button variant="link" onClick={() => setFocusTask(null)} className="text-muted-foreground">
                      Clear Focused Task
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground space-y-4">
                    <Target className="h-16 w-16 mx-auto text-muted-foreground" />
                    <p className="text-xl font-semibold">No task currently in focus.</p>
                    <p className="text-md">Select a task from your daily list to bring it into focus mode.</p>
                    <Button onClick={() => navigate('/daily-tasks')}>Go to Daily Tasks</Button>
                  </div>
                )}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={panelSizes[1]} minSize={20}>
              <div className="flex h-full items-start justify-center p-6 overflow-y-auto">
                <FocusToolsPanel
                  nextAvailableTask={nextAvailableTask}
                  tasks={processedTasks} // Use processedTasks
                  filteredTasks={filteredTasks}
                  updateTask={updateTask}
                  onOpenDetail={onOpenDetail}
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
      </div>
    </div>
  );
};

export default FocusMode;