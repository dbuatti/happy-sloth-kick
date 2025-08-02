import React, { useState, useCallback } from 'react';
import TaskList from '@/components/TaskList';
import { MadeWithDyad } from '@/components/made-with-dyad';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { addDays } from 'date-fns';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import CommandPalette from '@/components/CommandPalette';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import BulkActions from '@/components/BulkActions';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import DailyTasksHeader from '@/components/DailyTasksHeader';


const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const DailyTasksV3: React.FC = () => {
  const { user } = useAuth();

  const {
    tasks,
    filteredTasks,
    nextAvailableTask,
    updateTask,
    deleteTask,
    // Removed userId as it's not directly used in this component's logic
    loading: tasksLoading,
    sections,
    allCategories,
    handleAddTask,
    selectedTaskIds,
    toggleTaskSelection,
    clearSelectedTasks,
    bulkUpdateTasks,
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    reorderSections,
    updateTaskParentAndOrder,
    searchFilter,
    setSearchFilter,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    sectionFilter,
    setSectionFilter,
    currentDate,
    setCurrentDate,
  } = useTasks({ viewMode: 'daily' });

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);

  // State for section expansion, lifted from TaskList
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('taskList_expandedSections');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newState = { ...prev, [sectionId]: !(prev[sectionId] ?? true) };
      localStorage.setItem('taskList_expandedSections', JSON.stringify(newState));
      return newState;
    });
  }, []);

  const toggleAllSections = useCallback(() => {
    const allExpanded = Object.values(expandedSections).every(val => val === true);
    const newExpandedState: Record<string, boolean> = {};
    sections.forEach(section => {
      newExpandedState[section.id] = !allExpanded;
    });
    // Also handle 'no-section-header'
    newExpandedState['no-section-header'] = !allExpanded;

    setExpandedSections(newExpandedState);
    localStorage.setItem('taskList_expandedSections', JSON.stringify(newExpandedState));
  }, [expandedSections, sections]);


  const handleOpenOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleOpenDetail = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setIsTaskOverviewOpen(false);
    handleOpenDetail(task);
  };

  // Keyboard shortcuts
  const shortcuts: ShortcutMap = {
    'arrowleft': () => setCurrentDate(prevDate => getUTCStartOfDay(addDays(prevDate, -1))),
    'arrowright': () => setCurrentDate(prevDate => getUTCStartOfDay(addDays(prevDate, 1))),
    't': () => setCurrentDate(getUTCStartOfDay(new Date())),
    '/': (e) => { e.preventDefault(); /* Focus handled by TaskFilter's searchRef */ },
    'cmd+k': (e) => { e.preventDefault(); setIsCommandPaletteOpen(prev => !prev); },
  };
  useKeyboardShortcuts(shortcuts);

  const isBulkActionsActive = selectedTaskIds.length > 0;

  return (
    <div className="flex-1 flex flex-col">
      <main className={cn("flex-grow", isBulkActionsActive ? "pb-[90px]" : "")}>
        <div className="w-full max-w-4xl mx-auto flex flex-col">
          {/* New DailyTasksHeader component */}
          <DailyTasksHeader
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            tasks={tasks}
            filteredTasks={filteredTasks}
            sections={sections}
            allCategories={allCategories}
            handleAddTask={handleAddTask}
            userId={user?.id || null}
            setIsFocusPanelOpen={setIsFocusPanelOpen}
            searchFilter={searchFilter}
            setSearchFilter={setSearchFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            sectionFilter={sectionFilter}
            setSectionFilter={setSectionFilter}
            nextAvailableTask={nextAvailableTask}
            updateTask={updateTask}
            onOpenOverview={handleOpenOverview}
            createSection={createSection} // Pass new props
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          />

          {/* Main Task List Card */}
          <Card className="p-3 flex-1 flex flex-col rounded-none shadow-none">
            <CardContent className="p-4 flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto pt-3">
                <TaskList
                  tasks={tasks}
                  filteredTasks={filteredTasks}
                  loading={tasksLoading}
                  handleAddTask={handleAddTask}
                  updateTask={updateTask}
                  deleteTask={deleteTask}
                  selectedTaskIds={selectedTaskIds}
                  toggleTaskSelection={toggleTaskSelection}
                  clearSelectedTasks={clearSelectedTasks}
                  bulkUpdateTasks={bulkUpdateTasks}
                  markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
                  sections={sections}
                  createSection={createSection}
                  updateSection={updateSection}
                  deleteSection={deleteSection}
                  updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                  updateTaskParentAndOrder={updateTaskParentAndOrder}
                  reorderSections={reorderSections}
                  allCategories={allCategories}
                  setIsAddTaskOpen={() => {}}
                  onOpenOverview={handleOpenOverview}
                  currentDate={currentDate}
                  setCurrentDate={setCurrentDate}
                  expandedSections={expandedSections}
                  toggleSection={toggleSection}
                  toggleAllSections={toggleAllSections}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="p-4">
        <MadeWithDyad />
      </footer>

      <BulkActions
        selectedTaskIds={selectedTaskIds}
        onAction={async (action) => {
          if (action.startsWith('priority-')) {
            await bulkUpdateTasks({ priority: action.replace('priority-', '') as Task['priority'] });
          } else if (action === 'complete') {
            await bulkUpdateTasks({ status: 'completed' });
          } else if (action === 'archive') {
            await bulkUpdateTasks({ status: 'archived' });
          } else if (action === 'delete') {
            await Promise.all(selectedTaskIds.map(id => deleteTask(id)));
            clearSelectedTasks();
          }
        }}
        onClearSelection={clearSelectedTasks}
      />

      <CommandPalette
        isCommandPaletteOpen={isCommandPaletteOpen}
        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
      />

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => {
            setIsTaskOverviewOpen(false);
            setTaskToOverview(null);
          }}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={tasks}
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
          createSection={createSection} // Pass new props
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        />
      )}

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        tasks={tasks}
        filteredTasks={filteredTasks}
        updateTask={updateTask}
        onDeleteTask={deleteTask}
        sections={sections}
        allCategories={allCategories}
        currentDate={currentDate}
      />
    </div>
  );
};

export default DailyTasksV3;