"use client";

import React, { useState, useCallback } from 'react';
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Target, XSquare, Archive, ChevronsDownUp, Plus } from 'lucide-react';
import TaskList from './TaskList';
import AddTaskDialog from './AddTaskDialog';
import { Separator } from '@/components/ui/separator';

interface FocusPanelProps {
  allTasks: Task[];
  filteredTasks: Task[];
  loading: boolean;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onOpenDetail: (task: Task) => void;
  onDeleteTask: (taskId: string) => Promise<boolean | undefined>;
  sections: TaskSection[];
  allCategories: Category[];
  handleAddTask: (taskData: NewTaskData) => Promise<any>;
  currentDate: Date;
  setFocusTask: (taskId: string | null) => Promise<void>;
  doTodayOffIds: Set<string>;
  toggleDoToday: (task: Task) => Promise<void>;
  archiveAllCompletedTasks: () => Promise<void>;
  toggleAllDoToday: () => Promise<void>;
  markAllTasksAsSkipped?: () => Promise<void>;
  isDemo?: boolean;
  createCategory: (name: string, color: string) => Promise<string | null>;
  updateCategory: (categoryId: string, updates: Partial<Category>) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
}

const FocusPanel: React.FC<FocusPanelProps> = ({
  allTasks,
  filteredTasks,
  loading,
  updateTask,
  onOpenDetail,
  onDeleteTask,
  sections,
  allCategories,
  handleAddTask,
  currentDate,
  setFocusTask,
  doTodayOffIds,
  toggleDoToday,
  archiveAllCompletedTasks,
  toggleAllDoToday,
  markAllTasksAsSkipped,
  isDemo,
  createCategory,
  updateCategory,
  deleteCategory,
}) => {
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [preselectedParentTaskId, setPreselectedParentTaskId] = useState<string | null>(null);
  const [preselectedSectionIdForSubtask, setPreselectedSectionIdForSubtask] = useState<string | null>(null);

  const openAddTaskDialog = useCallback((parentTaskId: string | null = null, sectionId: string | null = null) => {
    setPreselectedParentTaskId(parentTaskId);
    setPreselectedSectionIdForSubtask(sectionId);
    setIsAddTaskDialogOpen(true);
  }, []);

  const closeAddTaskDialog = useCallback(() => {
    setIsAddTaskDialogOpen(false);
    setPreselectedParentTaskId(null);
    setPreselectedSectionIdForSubtask(null);
  }, []);

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Target className="h-6 w-6 text-primary" /> Focus Mode
      </h2>
      <p className="text-muted-foreground mb-4">
        Concentrate on your most important tasks without distractions.
      </p>

      <Separator className="my-4" />

      <div className="flex-1 overflow-y-auto">
        <TaskList
          processedTasks={allTasks}
          filteredTasks={filteredTasks}
          loading={loading}
          updateTask={updateTask}
          deleteTask={onDeleteTask}
          markAllTasksInSectionCompleted={async () => {}} // No-op for now in FocusPanel
          sections={sections}
          createSection={async () => {}} // No-op for now in FocusPanel
          updateTaskParentAndOrder={async () => {}} // No-op for now in FocusPanel
          onOpenOverview={onOpenDetail}
          currentDate={currentDate}
          expandedSections={{}}
          expandedTasks={{}}
          toggleTask={() => {}}
          toggleSection={() => {}}
          setFocusTask={setFocusTask}
          doTodayOffIds={doTodayOffIds}
          toggleDoToday={toggleDoToday}
          scheduledTasksMap={new Map()} // Not directly used in TaskList within FocusPanel
          isDemo={isDemo}
          selectedTaskIds={new Set()}
          onSelectTask={() => {}}
          onOpenAddTaskDialog={openAddTaskDialog}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button onClick={() => openAddTaskDialog()} disabled={isDemo}>
          <Plus className="h-4 w-4 mr-2" /> Add Task to Focus
        </Button>
        <Button variant="outline" onClick={archiveAllCompletedTasks} disabled={isDemo}>
          <Archive className="h-4 w-4 mr-2" /> Archive All Done
        </Button>
        <Button variant="outline" onClick={toggleAllDoToday} disabled={isDemo}>
          <ChevronsDownUp className="h-4 w-4 mr-2" /> Toggle All Do Today
        </Button>
        {markAllTasksAsSkipped && (
          <Button variant="outline" onClick={markAllTasksAsSkipped} disabled={isDemo}>
            <XSquare className="h-4 w-4 mr-2" /> Mark All Skipped
          </Button>
        )}
      </div>

      <AddTaskDialog
        isOpen={isAddTaskDialogOpen}
        onClose={closeAddTaskDialog}
        onSave={handleAddTask}
        sections={sections}
        allCategories={allCategories}
        currentDate={currentDate}
        createSection={async () => {}}
        updateSection={async () => {}}
        deleteSection={async () => {}}
        updateSectionIncludeInFocusMode={async () => {}}
        allTasks={allTasks}
        preselectedParentTaskId={preselectedParentTaskId}
        preselectedSectionId={preselectedSectionIdForSubtask}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
      />
    </div>
  );
};

export default FocusPanel;