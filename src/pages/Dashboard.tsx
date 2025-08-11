import React, { useState } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { CheckCircle2, ListTodo, CalendarDays } from 'lucide-react';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import SupportLinkCard from '@/components/dashboard/SupportLink';
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
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import NextTaskCard from '@/components/dashboard/NextTaskCard';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import TaskDetailDialog from '@/components/TaskDetailDialog';

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
    settings, 
    updateSettings, 
    loading: dashboardDataLoading,
    updateCustomCard,
  } = useDashboardData({ userId: demoUserId });

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
  } = useTasks({ viewMode: 'daily', userId: demoUserId });

  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardContent, setNewCardContent] = useState('');
  const [newCardEmoji, setNewCardEmoji] = useState('');
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

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

  const statCards = [
    { title: "Tasks Due Today", value: tasksDue, icon: ListTodo, description: "tasks remaining for today", className: "bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/20" },
    { title: "Tasks Completed", value: tasksCompleted, icon: CheckCircle2, description: "tasks completed today", className: "bg-green-500/5 dark:bg-green-500/10 border-green-500/20" },
    { title: "Appointments", value: appointmentsToday, icon: CalendarDays, description: "events scheduled for today", className: "bg-purple-500/5 dark:bg-purple-500/10 border-purple-500/20" },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 md:p-6">
        <DashboardHeader
          onAddCard={() => setIsAddCardOpen(true)}
          onCustomizeLayout={() => setIsLayoutSettingsOpen(true)}
          isDemo={isDemo}
          demoUserId={demoUserId}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="flex flex-col justify-center">
            <NextTaskCard 
              nextAvailableTask={nextAvailableTask}
              updateTask={updateTask}
              onOpenOverview={handleOpenOverview}
              loading={tasksLoading}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="md:col-span-3">
            {settings?.dashboard_layout?.['dailyScheduleVisible'] !== false && (
              <DailySchedulePreview />
            )}
          </div>
          <div className="md:col-span-1">
            {settings?.dashboard_layout?.['weeklyFocusVisible'] !== false && (
              <WeeklyFocusCard 
                weeklyFocus={weeklyFocus} 
                updateWeeklyFocus={updateWeeklyFocus} 
                loading={dashboardDataLoading} 
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PomodoroCard />
          {settings?.dashboard_layout?.['peopleMemoryVisible'] !== false && (
            <PeopleMemoryCard />
          )}
          {customCards.filter(card => card.is_visible).map(card => (
            <CustomCard key={card.id} card={card} />
          ))}
          {settings?.dashboard_layout?.['supportLinkVisible'] !== false && (
            <SupportLinkCard 
              settings={settings} 
              updateSettings={updateSettings} 
              loading={dashboardDataLoading} 
            />
          )}
          {settings?.dashboard_layout?.['meditationNotesVisible'] !== false && (
            <MeditationNotesCard 
              settings={settings} 
              updateSettings={updateSettings} 
              loading={dashboardDataLoading} 
            />
          )}
        </div>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
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
          allTasks={allTasks}
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
        />
      )}
    </div>
  );
};

export default Dashboard;