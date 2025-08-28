import React, { useState } from 'react';
import { CheckCircle2, ListTodo, CalendarDays } from 'lucide-react';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import CustomCard from '@/components/dashboard/CustomCard';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatCard from '@/components/dashboard/StatCard';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useTasks, Task } from '@/hooks/useTasks';
import NextTaskCard from '@/components/dashboard/NextTaskCard';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { AnimatePresence } from 'framer-motion';
import { useSound } from '@/context/SoundContext';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,

} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { useIsMobile } from '@/hooks/use-mobile';
import { useSettings } from '@/context/SettingsContext';
import ADHDTimeDateBanner from '@/components/ADHDTimeDateBanner'; // Import the new banner

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { 
    customCards, 
    addCustomCard, 
    weeklyFocus, 
    updateWeeklyFocus, 
    loading: dashboardDataLoading,
    updateCustomCard,
    reorderCustomCards,
  } = useDashboardData({ userId: demoUserId });

  const { settings, updateSettings } = useSettings();

  const { tasksDue, tasksCompleted, appointmentsToday, loading: statsLoading } = useDashboardStats({ userId: demoUserId });
  
  const {
    tasks: allTasks,
    nextAvailableTask,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    loading: tasksLoading,
  } = useTasks({ viewMode: 'daily', userId: demoUserId, currentDate: new Date() }); // Pass new Date()

  const { playSound } = useSound();
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardContent, setNewCardContent] = useState('');
  const [newCardEmoji, setNewCardEmoji] = useState('');
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isFocusViewOpen, setIsFocusViewOpen] = useState(false);

  const [activeDragItem, setActiveDragItem] = useState<any>(null);

  const isMobile = useIsMobile();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // User must move 8px before a drag starts
      },
    })
  );

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    await addCustomCard({
      title: newCardTitle,
      content: newCardContent,
      emoji: newCardEmoji,
      card_order: customCards.length,
    });
    setNewCardTitle('');
    setNewCardContent('');
    setNewCardEmoji('');
    setIsAddCardOpen(false);
  };

  const handleOpenOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setIsTaskOverviewOpen(false);
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const handleOpenFocusView = () => {
    if (nextAvailableTask) {
      setIsFocusViewOpen(true);
    }
  };

  const handleMarkDoneFromFocusView = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      playSound('success');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(customCards.find(card => card.id === event.active.id) || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = customCards.findIndex(card => card.id === active.id);
    const newIndex = customCards.findIndex(card => card.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrderedCards = arrayMove(customCards, oldIndex, newIndex);
      await reorderCustomCards(newOrderedCards.map(card => card.id));
    }
  };

  const handlePanelLayoutChange = (sizes: number[]) => {
    if (settings) {
      updateSettings({ dashboard_panel_sizes: sizes });
    }
  };

  const statCards = [
    { title: "Tasks Due Today", value: tasksDue, icon: ListTodo, description: "tasks remaining for today", className: "bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/20" },
    { title: "Tasks Completed", value: tasksCompleted, icon: CheckCircle2, description: "tasks completed today", className: "bg-green-500/5 dark:bg-green-500/10 border-green-500/20" },
    { title: "Appointments", value: appointmentsToday, icon: CalendarDays, description: "events scheduled for today", className: "bg-purple-500/5 dark:bg-purple-500/10 border-purple-500/20" },
  ];

  const defaultPanelSizes = settings?.dashboard_panel_sizes || [66, 34];

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 flex flex-col">
        <main className="flex-grow p-4 md:p-6 flex flex-col">
          <ADHDTimeDateBanner /> {/* Placed at the top of the main content area */}
          <DashboardHeader
            onAddCard={() => setIsAddCardOpen(true)}
            onCustomizeLayout={() => setIsLayoutSettingsOpen(true)}
            isDemo={isDemo}
            demoUserId={demoUserId}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {statCards.map(stat => (
              <StatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                description={stat.description}
                loading={statsLoading}
                className={stat.className}
              />
            ))}
          </div>

          {isMobile ? (
            <div className="grid grid-cols-1 gap-6 relative z-[1]">
              <div className="space-y-6">
                {settings?.dashboard_layout?.['dailyBriefingVisible'] !== false && (
                  <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} />
                )}
                {settings?.dashboard_layout?.['dailyScheduleVisible'] !== false && (
                  <DailySchedulePreview />
                )}
                <SortableContext items={customCards.map(card => card.id)} strategy={verticalListSortingStrategy}>
                  {customCards.filter(card => card.is_visible).map(card => (
                    <SortableCustomCard key={card.id} card={card} />
                  ))}
                </SortableContext>
              </div>
              <div className="space-y-6">
                <NextTaskCard 
                  nextAvailableTask={nextAvailableTask}
                  updateTask={updateTask}
                  onOpenOverview={handleOpenOverview}
                  loading={tasksLoading}
                  onFocusViewOpen={handleOpenFocusView}
                />
                {settings?.dashboard_layout?.['weeklyFocusVisible'] !== false && (
                  <WeeklyFocusCard 
                    weeklyFocus={weeklyFocus} 
                    updateWeeklyFocus={updateWeeklyFocus} 
                    loading={dashboardDataLoading} 
                  />
                )}
                {settings?.dashboard_layout?.['peopleMemoryVisible'] !== false && (
                  <PeopleMemoryCard />
                )}
                {settings?.dashboard_layout?.['meditationNotesVisible'] !== false && (
                  <MeditationNotesCard 
                    settings={settings} 
                    updateSettings={updateSettings} 
                    loading={dashboardDataLoading} 
                  />
                )}
              </div>
            </div>
          ) : (
            <PanelGroup
              direction="horizontal"
              className="flex-grow rounded-lg border relative z-[1]"
              onLayout={handlePanelLayoutChange}
            >
              <Panel defaultSize={defaultPanelSizes[0]} minSize={30}>
                <div className="flex h-full flex-col p-4 space-y-6">
                  {settings?.dashboard_layout?.['dailyBriefingVisible'] !== false && (
                    <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} />
                  )}
                  {settings?.dashboard_layout?.['dailyScheduleVisible'] !== false && (
                    <DailySchedulePreview />
                  )}
                  <SortableContext items={customCards.map(card => card.id)} strategy={verticalListSortingStrategy}>
                    {customCards.filter(card => card.is_visible).map(card => (
                      <SortableCustomCard key={card.id} card={card} />
                    ))}
                  </SortableContext>
                </div>
              </Panel>
              <PanelResizeHandle />
              <Panel defaultSize={defaultPanelSizes[1]} minSize={20}>
                <div className="flex h-full flex-col p-4 space-y-6">
                  <NextTaskCard 
                    nextAvailableTask={nextAvailableTask}
                    updateTask={updateTask}
                    onOpenOverview={handleOpenOverview}
                    loading={tasksLoading}
                    onFocusViewOpen={handleOpenFocusView}
                  />
                  {settings?.dashboard_layout?.['weeklyFocusVisible'] !== false && (
                    <WeeklyFocusCard 
                      weeklyFocus={weeklyFocus} 
                      updateWeeklyFocus={updateWeeklyFocus} 
                      loading={dashboardDataLoading} 
                    />
                  )}
                  {settings?.dashboard_layout?.['peopleMemoryVisible'] !== false && (
                    <PeopleMemoryCard />
                  )}
                  {settings?.dashboard_layout?.['meditationNotesVisible'] !== false && (
                    <MeditationNotesCard 
                      settings={settings} 
                      updateSettings={updateSettings} 
                      loading={dashboardDataLoading} 
                    />
                  )}
                </div>
              </Panel>
            </PanelGroup>
          )}
        </main>
        <footer className="p-4">
          <p>&copy; {new Date().getFullYear()} TaskMaster. All rights reserved.</p>
        </footer>

        <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Card</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Title</Label>
                <Input value={newCardTitle} onChange={(e) => setNewCardTitle(e.target.value)} placeholder="e.g., Things to Remember" />
              </div>
              <div>
                <Label>Emoji (Optional)</Label>
                <Input value={newCardEmoji} onChange={(e) => setNewCardEmoji(e.target.value)} placeholder="🍊" maxLength={2} />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea value={newCardContent} onChange={(e) => setNewCardContent(e.target.value)} placeholder="e.g., You have an orange" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddCardOpen(false)}>Cancel</Button>
              <Button onClick={handleAddCard}>Add Card</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DashboardLayoutSettings
          isOpen={isLayoutSettingsOpen}
          onClose={() => setIsLayoutSettingsOpen(false)}
          settings={settings}
          customCards={customCards}
          updateSettings={updateSettings}
          updateCustomCard={updateCustomCard}
        />

        {taskToOverview && (
          <TaskOverviewDialog
            task={taskToOverview}
            isOpen={isTaskOverviewOpen}
            onClose={() => setIsTaskOverviewOpen(false)}
            onEditClick={handleEditTaskFromOverview}
            onUpdate={updateTask}
            onDelete={deleteTask}
            sections={sections}
            allCategories={allCategories}
            allTasks={allTasks as Task[]} // Cast to Task[]
          />
        )}
        {taskToEdit && (
          <TaskDetailDialog
            task={taskToEdit}
            isOpen={isTaskDetailOpen}
            onClose={() => setIsTaskDetailOpen(false)}
            onUpdate={updateTask}
            onDelete={deleteTask}
            sections={sections}
            allCategories={allCategories}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            allTasks={allTasks as Task[]} // Cast to Task[]
          />
        )}
        <AnimatePresence>
          {isFocusViewOpen && nextAvailableTask && (
            <FullScreenFocusView
              taskDescription={nextAvailableTask.description || ''} // Ensure description is string
              onClose={() => setIsFocusViewOpen(false)}
              onMarkDone={handleMarkDoneFromFocusView}
            />
          )}
        </AnimatePresence>
      </div>
      {createPortal(
        <DragOverlay>
          {activeDragItem ? (
            <CustomCard card={activeDragItem} isOverlay />
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
};

export default Dashboard;