"use client";

import React, { useState, useCallback, useMemo } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X, Target, CheckCircle2, ListTodo, Archive, ChevronsDownUp, XSquare } from 'lucide-react';
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
import TaskItem from './TaskItem';
import { parseISO, isSameDay } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import QuickAddTask from './QuickAddTask';
import { Separator } from '@/components/ui/separator';

interface FocusPanelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  allTasks: Task[];
  filteredTasks: Task[];
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
  toggleAllDoToday: (filteredTasks: Task[]) => Promise<void>;
  markAllTasksAsSkipped: () => Promise<void>; // New prop
}

const FocusPanelDrawer: React.FC<FocusPanelDrawerProps> = ({
  isOpen,
  onClose,
  allTasks,
  filteredTasks,
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
  toggleAllDoToday: toggleAllDoTodayFromHook,
  markAllTasksAsSkipped, // Destructure new prop
}) => {
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const toggleTask = useCallback((taskId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: prev[taskId] === undefined ? false : !prev[taskId],
    }));
  }, []);

  const getSubtasksForTask = useCallback((parentTaskId: string) => {
    return allTasks.filter(t => t.parent_task_id === parentTaskId).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [allTasks]);

  const tasksInFocus = useMemo(() => {
    const focusModeSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));
    return filteredTasks.filter(task =>
      task.status === 'to-do' &&
      task.parent_task_id === null &&
      (task.section_id === null || focusModeSectionIds.has(task.section_id)) &&
      (task.recurring_type !== 'none' || !doTodayOffIds.has(task.original_task_id || task.id))
    ).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [filteredTasks, sections, doTodayOffIds]);

  const completedTasksCount = filteredTasks.filter(task =>
    task.status === 'completed' &&
    task.completed_at &&
    isSameDay(parseISO(task.completed_at), currentDate)
  ).length;

  const totalPendingCount = tasksInFocus.length;

  const handleToggleAllDoToday = useCallback(async () => {
    await toggleAllDoTodayFromHook(tasksInFocus);
  }, [toggleAllDoTodayFromHook, tasksInFocus]);

  return (
    <Drawer open={isOpen} onOpenChange={onClose} direction="right">
      <DrawerContent className="w-full md:max-w-md fixed right-0 top-0 h-full mt-0 rounded-none">
        <DrawerHeader className="flex items-center justify-between border-b p-4">
          <DrawerTitle className="text-xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Focus Mode
          </DrawerTitle>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close focus mode">
            <X className="h-5 w-5" />
          </Button>
        </DrawerHeader>
        <div className="p-4 flex-grow flex flex-col">
          <QuickAddTask
            onAddTask={handleAddTask}
            defaultCategoryId={allCategories[0]?.id || ''}
            allCategories={allCategories}
            currentDate={currentDate}
            sections={sections}
            createSection={() => Promise.resolve()}
            updateSection={() => Promise.resolve()}
            deleteSection={() => Promise.resolve()}
            updateSectionIncludeInFocusMode={() => Promise.resolve()}
          />
          <Separator className="my-4" />

          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <p className="flex items-center gap-1">
              <ListTodo className="h-4 w-4" /> {totalPendingCount} Pending
            </p>
            <p className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> {completedTasksCount} Completed
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={archiveAllCompletedTasks}
              disabled={completedTasksCount === 0}
              className="flex items-center justify-center"
            >
              <Archive className="h-4 w-4 mr-2" /> Archive Done
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleAllDoToday}
              disabled={totalPendingCount === 0}
              className="flex items-center justify-center"
            >
              <ChevronsDownUp className="h-4 w-4 mr-2" /> Toggle Do Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={markAllTasksAsSkipped}
              disabled={totalPendingCount === 0}
              className="flex items-center justify-center"
            >
              <XSquare className="h-4 w-4 mr-2" /> Mark All Skipped
            </Button>
          </div>

          <h3 className="text-lg font-semibold mb-3">Tasks in Focus</h3>
          <ScrollArea className="flex-1 pr-4 -mr-4">
            {tasksInFocus.length > 0 ? (
              <ul className="space-y-2">
                {tasksInFocus.map(task => (
                  <li key={task.id} className="relative">
                    <TaskItem
                      task={task}
                      allTasks={allTasks}
                      onDelete={onDeleteTask}
                      onUpdate={updateTask}
                      sections={sections}
                      onOpenOverview={onOpenDetail}
                      currentDate={currentDate}
                      level={0}
                      isExpanded={expandedTasks[task.id] === true}
                      toggleExpand={toggleTask}
                      setFocusTask={setFocusTask}
                      isDoToday={!doTodayOffIds.has(task.original_task_id || task.id)}
                      toggleDoToday={toggleDoToday}
                      isDemo={false}
                      isSelected={false}
                      onSelectTask={() => {}}
                      hasSubtasks={getSubtasksForTask(task.id).length > 0}
                      onAddSubtask={() => {}}
                    />
                    {expandedTasks[task.id] && getSubtasksForTask(task.id).length > 0 && (
                      <ul className="ml-6 mt-2 space-y-2">
                        {getSubtasksForTask(task.id).map(subtask => (
                          <li key={subtask.id}>
                            <TaskItem
                              task={subtask}
                              allTasks={allTasks}
                              onDelete={onDeleteTask}
                              onUpdate={updateTask}
                              sections={sections}
                              onOpenOverview={onOpenDetail}
                              currentDate={currentDate}
                              level={1}
                              isExpanded={expandedTasks[subtask.id] === true}
                              toggleExpand={toggleTask}
                              setFocusTask={setFocusTask}
                              isDoToday={!doTodayOffIds.has(subtask.original_task_id || subtask.id)}
                              toggleDoToday={toggleDoToday}
                              isDemo={false}
                              isSelected={false}
                              onSelectTask={() => {}}
                              hasSubtasks={getSubtasksForTask(subtask.id).length > 0}
                              onAddSubtask={() => {}}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <ListTodo className="h-12 w-12 mx-auto mb-3 text-primary/40" />
                <p className="text-lg font-medium">No tasks in focus!</p>
                <p className="text-sm mt-1">Add a task or set one as focus to get started.</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default FocusPanelDrawer;