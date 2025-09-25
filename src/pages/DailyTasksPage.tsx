"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useTasks, Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import FloatingAddTaskButton from '@/components/FloatingAddTaskButton';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import TaskForm from '@/components/TaskForm';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import { useSettings } from '@/context/SettingsContext'; // Import useSettings
import { useAuth } from '@/context/AuthContext';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments';
import { useKeyboardShortcuts, ShortcutMap } from '@/hooks/useKeyboardShortcuts';

interface DailyTasksPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DailyTasksPage: React.FC<DailyTasksPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const { settings, updateSettings } = useSettings(); // Destructure updateSettings

  const [currentDate, setCurrentDate] = useState(new Date());
  const {
    tasks,
    processedTasks,
    filteredTasks,
    loading,
    handleAddTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
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
    sections,
    allCategories,
    updateTaskParentAndOrder,
    archiveAllCompletedTasks,
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    reorderSections,
    nextAvailableTask,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
  } = useTasks({ currentDate, viewMode: 'daily', userId });

  const { appointments: allAppointments } = useAllAppointments();

  const scheduledTasksMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    allAppointments.forEach(app => {
      if (app.task_id) {
        map.set(app.task_id, app);
      }
    });
    return map;
  }, [allAppointments]);

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  const taskListRef = useRef<any>(null);

  const expandedSections = useMemo(() => {
    return settings?.dashboard_layout?.expandedSections || {};
  }, [settings?.dashboard_layout?.expandedSections]);

  const expandedTasks = useMemo(() => {
    return settings?.dashboard_layout?.expandedTasks || {};
  }, [settings?.dashboard_layout?.expandedTasks]);

  const toggleSection = useCallback(async (sectionId: string) => {
    const newExpandedSections = {
      ...expandedSections,
      [sectionId]: !(expandedSections[sectionId] ?? true), // Default to true if not set
    };
    await updateSettings({ dashboard_layout: { ...settings?.dashboard_layout, expandedSections: newExpandedSections } });
  }, [expandedSections, settings?.dashboard_layout, updateSettings]);

  const toggleTask = useCallback(async (taskId: string) => {
    const newExpandedTasks = {
      ...expandedTasks,
      [taskId]: !(expandedTasks[taskId] ?? true), // Default to true if not set
    };
    await updateSettings({ dashboard_layout: { ...settings?.dashboard_layout, expandedTasks: newExpandedTasks } });
  }, [expandedTasks, settings?.dashboard_layout, updateSettings]);

  const toggleAllSections = useCallback(async () => {
    const allCurrentlyExpanded = sections.every(s => expandedSections[s.id] ?? true);
    const newExpandedState = !allCurrentlyExpanded;
    const newExpandedSections = sections.reduce((acc, section) => {
      acc[section.id] = newExpandedState;
      return acc;
    }, {} as Record<string, boolean>);
    await updateSettings({ dashboard_layout: { ...settings?.dashboard_layout, expandedSections: newExpandedSections } });
  }, [sections, expandedSections, settings?.dashboard_layout, updateSettings]);

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleOpenFocusView = useCallback(() => {
    setIsFocusPanelOpen(true);
  }, []);

  const handleNewTaskSubmit = async (taskData: NewTaskData) => {
    const success = await handleAddTask(taskData);
    if (success) {
      setIsAddTaskOpen(false);
    }
    return success;
  };

  const handleBulkDelete = async (ids: string[]) => {
    await bulkDeleteTasks(ids);
  };

  const handleBulkUpdate = async (updates: Partial<Task>, ids: string[]) => {
    await bulkUpdateTasks(updates, ids);
  };

  const keyboardShortcuts: ShortcutMap = useMemo(() => ({
    'cmd+k': () => { /* Handled by CommandPalette */ },
    'n': () => setIsAddTaskOpen(true),
    'f': () => setIsFocusPanelOpen(true),
    't': () => setCurrentDate(new Date()),
    'left': () => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() - 1))),
    'right': () => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() + 1))),
  }), []);

  useKeyboardShortcuts(keyboardShortcuts);

  return (
    <div className="flex flex-col h-full">
      <DailyTasksHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
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
        sections={sections}
        allCategories={allCategories}
        userId={userId}
        setIsFocusPanelOpen={setIsFocusPanelOpen}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        archiveAllCompletedTasks={archiveAllCompletedTasks}
        toggleAllDoToday={toggleAllDoToday}
        dailyProgress={dailyProgress}
        isDemo={isDemo}
        nextAvailableTask={nextAvailableTask}
        updateTask={updateTask}
        onOpenOverview={handleOpenTaskOverview}
        onOpenFocusView={handleOpenFocusView}
        tasksLoading={loading}
        doTodayOffIds={doTodayOffIds}
        toggleDoToday={toggleDoToday}
        onToggleAllSections={toggleAllSections}
        isManageCategoriesOpen={isManageCategoriesOpen}
        setIsManageCategoriesOpen={setIsManageCategoriesOpen}
        isManageSectionsOpen={isManageSectionsOpen}
        setIsManageSectionsOpen={setIsManageSectionsOpen}
      />

      <CardContent className="flex-1 overflow-y-auto p-4">
        <TaskList
          ref={taskListRef}
          processedTasks={processedTasks}
          filteredTasks={filteredTasks}
          loading={loading}
          handleAddTask={handleAddTask}
          updateTask={updateTask}
          deleteTask={deleteTask}
          bulkUpdateTasks={handleBulkUpdate}
          markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
          sections={sections}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          updateTaskParentAndOrder={updateTaskParentAndOrder}
          reorderSections={reorderSections}
          allCategories={allCategories}
          setIsAddTaskOpen={setIsAddTaskOpen}
          onOpenOverview={handleOpenTaskOverview}
          currentDate={currentDate}
          expandedSections={expandedSections}
          expandedTasks={expandedTasks}
          toggleTask={toggleTask}
          toggleSection={toggleSection}
          toggleAllSections={toggleAllSections}
          setFocusTask={setFocusTask}
          doTodayOffIds={doTodayOffIds}
          toggleDoToday={toggleDoToday}
          scheduledTasksMap={scheduledTasksMap}
          isDemo={isDemo}
        />
      </CardContent>

      <FloatingAddTaskButton onClick={() => setIsAddTaskOpen(true)} isDemo={isDemo} />

      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription className="sr-only">
              Fill in the details to add a new task.
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            onSave={handleNewTaskSubmit}
            onCancel={() => setIsAddTaskOpen(false)}
            sections={sections}
            allCategories={allCategories}
            currentDate={currentDate}
            autoFocus
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            allTasks={processedTasks}
          />
        </DialogContent>
      </Dialog>

      {taskToOverview && (
        <TaskDetailDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          allTasks={processedTasks}
        />
      )}

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        allTasks={processedTasks}
        filteredTasks={filteredTasks}
        updateTask={updateTask}
        onOpenDetail={handleOpenTaskOverview}
        onDeleteTask={deleteTask}
        sections={sections}
        allCategories={allCategories}
        handleAddTask={handleAddTask}
        currentDate={currentDate}
        setFocusTask={setFocusTask}
        doTodayOffIds={doTodayOffIds}
        toggleDoToday={toggleDoToday}
      />
    </div>
  );
};

export default DailyTasksPage;