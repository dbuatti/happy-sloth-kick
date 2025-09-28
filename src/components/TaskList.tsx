"use client";

import React, { useState, useMemo, useCallback } from 'react'; // Removed useEffect
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableTaskItem from './SortableTaskItem';
import TaskItem from './TaskItem';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronDown, ChevronRight, CheckCircle2, Trash2, Settings, Edit } from 'lucide-react'; // Removed Archive, Eye, EyeOff, added Edit
import QuickAddTask from './QuickAddTask';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  // DropdownMenuSeparator, // Removed
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { showSuccess, showError } from '@/utils/toast';
import { Appointment } from '@/hooks/useAppointments';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

// Define QuickAddTaskProps locally to resolve type errors
interface QuickAddTaskProps {
  onAddTask: (description: string) => Promise<string | null | void>;
  placeholder: string;
  isDemo?: boolean;
}

interface TaskListProps {
  processedTasks: Task[];
  filteredTasks: Task[];
  loading: boolean;
  handleAddTask: (newTaskData: { description: string; category: string | null; priority: string; section_id?: string | null; parent_task_id?: string | null }) => Promise<string | null>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  deleteTask: (taskId: string) => void;
  // bulkUpdateTasks: (updates: Partial<Task>, ids: string[]) => Promise<void>; // Removed
  // bulkDeleteTasks: (ids: string[]) => Promise<boolean>; // Removed
  markAllTasksInSectionCompleted: (sectionId: string | null) => Promise<void>;
  sections: TaskSection[];
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  updateTaskParentAndOrder: (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null, isDraggingDown: boolean) => Promise<void>;
  reorderSections: (activeId: string, overId: string) => Promise<void>;
  allCategories: Category[];
  setIsAddTaskOpen: (isOpen: boolean) => void;
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  expandedSections: Record<string, boolean>;
  expandedTasks: Record<string, boolean>;
  toggleTask: (taskId: string) => void;
  toggleSection: (sectionId: string) => void;
  // toggleAllSections: () => void; // Removed
  setFocusTask: (taskId: string | null) => Promise<void>;
  doTodayOffIds: Set<string>;
  toggleDoToday: (task: Task) => void;
  scheduledTasksMap: Map<string, Appointment>;
  isDemo?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({
  processedTasks,
  filteredTasks,
  loading,
  handleAddTask,
  updateTask,
  deleteTask,
  // bulkUpdateTasks, // Removed
  // bulkDeleteTasks, // Removed
  markAllTasksInSectionCompleted,
  sections,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  updateTaskParentAndOrder,
  reorderSections,
  allCategories,
  onOpenOverview,
  currentDate,
  expandedSections,
  expandedTasks,
  toggleTask,
  toggleSection,
  // toggleAllSections, // Removed
  setFocusTask,
  doTodayOffIds,
  toggleDoToday,
  scheduledTasksMap,
  isDemo = false,
}) => {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [isAddSectionDialogOpen, setIsAddSectionDialogOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [isEditSectionDialogOpen, setIsEditSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<TaskSection | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [editingSectionIncludeInFocusMode, setEditingSectionIncludeInFocusMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeTask = activeId ? processedTasks.find(task => task.id === activeId) : null;
  const activeSection = activeId ? sections.find(section => section.id === activeId) : null;

  const tasksBySection = useMemo(() => {
    const map = new Map<string | null, Task[]>();
    filteredTasks.forEach(task => {
      const sectionId = task.section_id || null;
      if (!map.has(sectionId)) {
        map.set(sectionId, []);
      }
      map.get(sectionId)!.push(task);
    });
    map.forEach(tasks => tasks.sort((a, b) => (a.order || 0) - (b.order || 0)));
    return map;
  }, [filteredTasks]);

  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [sections]);

  const getSubtasks = useCallback((parentId: string) => {
    return filteredTasks.filter(task => task.parent_task_id === parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [filteredTasks]);

  const handleDragStart = useCallback((event: any) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback(async (event: any) => {
    const { active, over } = event;

    if (!over) return;

    const activeIsTask = processedTasks.some(t => t.id === active.id);
    const overIsTask = processedTasks.some(t => t.id === over.id);
    const activeIsSection = sections.some(s => s.id === active.id);
    const overIsSection = sections.some(s => s.id === over.id);

    if (activeIsTask && overIsTask) {
      const activeTask = processedTasks.find(t => t.id === active.id);
      const overTask = processedTasks.find(t => t.id === over.id);

      if (activeTask && overTask && active.id !== over.id) {
        const isDraggingDown = (activeTask.order || 0) < (overTask.order || 0);
        await updateTaskParentAndOrder(active.id as string, overTask.parent_task_id, overTask.section_id, over.id as string, isDraggingDown);
      }
    } else if (activeIsTask && overIsSection) {
      const activeTask = processedTasks.find(t => t.id === active.id);
      const overSection = sections.find(s => s.id === over.id);

      if (activeTask && overSection) {
        await updateTaskParentAndOrder(active.id as string, null, overSection.id, null, false);
      }
    } else if (activeIsTask && over.id === 'no-section-dropzone') {
      const activeTask = processedTasks.find(t => t.id === active.id);
      if (activeTask) {
        await updateTaskParentAndOrder(active.id as string, null, null, null, false);
      }
    } else if (activeIsSection && overIsSection) {
      if (active.id !== over.id) {
        await reorderSections(active.id as string, over.id as string);
      }
    }

    setActiveId(null);
  }, [processedTasks, sections, updateTaskParentAndOrder, reorderSections]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleAddSection = async () => {
    if (newSectionName.trim()) {
      await createSection(newSectionName.trim());
      setNewSectionName('');
      setIsAddSectionDialogOpen(false);
    } else {
      showError('Section name cannot be empty.');
    }
  };

  const handleEditSection = (section: TaskSection) => {
    setEditingSection(section);
    setEditingSectionName(section.name);
    setEditingSectionIncludeInFocusMode(section.include_in_focus_mode);
    setIsEditSectionDialogOpen(true);
  };

  const handleSaveSectionEdit = async () => {
    if (editingSection && editingSectionName.trim()) {
      await updateSection(editingSection.id, editingSectionName.trim());
      await updateSectionIncludeInFocusMode(editingSection.id, editingSectionIncludeInFocusMode);
      setIsEditSectionDialogOpen(false);
      setEditingSection(null);
    } else {
      showError('Section name cannot be empty.');
    }
  };

  const handleMarkAllCompleted = useCallback(async (sectionId: string | null) => {
    await markAllTasksInSectionCompleted(sectionId);
  }, [markAllTasksInSectionCompleted]);

  const renderTask = useCallback((task: Task, level: number, sectionId: string | null) => {
    const subtasks = getSubtasks(task.id);
    const isTaskExpanded = expandedTasks[task.id] === undefined ? true : expandedTasks[task.id];
    const isDoToday = task.recurring_type !== 'none' || !doTodayOffIds.has(task.original_task_id || task.id);

    return (
      <div key={task.id} className={cn("py-1", level > 0 && "pl-6")}>
        <SortableTaskItem
          id={task.id}
          task={task}
          allTasks={processedTasks}
          onDelete={deleteTask}
          onUpdate={updateTask}
          sections={sections}
          onOpenOverview={onOpenOverview}
          currentDate={currentDate}
          onMoveUp={() => Promise.resolve()} // Placeholder
          onMoveDown={() => Promise.resolve()} // Placeholder
          level={level}
          hasSubtasks={subtasks.length > 0}
          isExpanded={isTaskExpanded}
          toggleTask={toggleTask}
          setFocusTask={setFocusTask}
          isDoToday={isDoToday}
          toggleDoToday={toggleDoToday}
          scheduledTasksMap={scheduledTasksMap}
          isDemo={isDemo}
          expandedTasks={expandedTasks} // Pass expandedTasks here
        />
        {subtasks.length > 0 && isTaskExpanded && (
          <div className="pl-4 border-l ml-2">
            {subtasks.map(subtask => renderTask(subtask, level + 1, sectionId))}
          </div>
        )}
      </div>
    );
  }, [processedTasks, deleteTask, updateTask, sections, onOpenOverview, currentDate, getSubtasks, expandedTasks, toggleTask, setFocusTask, doTodayOffIds, toggleDoToday, scheduledTasksMap, isDemo]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const tasksWithoutSection = tasksBySection.get(null) || [];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-6">
        {/* Sections */}
        <SortableContext items={sortedSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {sortedSections.map(section => {
            const tasksInSection = tasksBySection.get(section.id) || [];
            const topLevelTasks = tasksInSection.filter(task => task.parent_task_id === null);
            const isSectionExpanded = expandedSections[section.id] === undefined ? true : expandedSections[section.id];

            return (
              <div key={section.id} className="rounded-xl border bg-card text-card-foreground shadow-sm p-4">
                <Collapsible
                  open={isSectionExpanded}
                  onOpenChange={() => toggleSection(section.id)}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-start px-2 -ml-2">
                        {isSectionExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                        <h3 className="text-lg font-semibold">{section.name}</h3>
                      </Button>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleEditSection(section)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Section
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleMarkAllCompleted(section.id)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark All Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={async () => { await deleteSection(section.id); showSuccess('Section deleted!'); }}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Section
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <QuickAddTask
                        onAddTask={(description: string) => handleAddTask({ description, category: allCategories[0]?.id || '', priority: 'medium', section_id: section.id })}
                        placeholder={`Add task to ${section.name}...`}
                        isDemo={isDemo}
                      />
                    </div>
                  </div>
                  <CollapsibleContent>
                    <Separator className="my-2" />
                    <SortableContext items={topLevelTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {topLevelTasks.length > 0 ? (
                          topLevelTasks.map(task => renderTask(task, 0, section.id))
                        ) : (
                          <p className="text-muted-foreground text-sm p-2">No tasks in this section.</p>
                        )}
                      </div>
                    </SortableContext>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}
        </SortableContext>

        {/* Tasks without a section */}
        {tasksWithoutSection.length > 0 && (
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Tasks Without Section</h3>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => handleMarkAllCompleted(null)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Mark All Completed
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <QuickAddTask
                  onAddTask={(description: string) => handleAddTask({ description, category: allCategories[0]?.id || '', priority: 'medium', section_id: null })}
                  placeholder="Add task without section..."
                  isDemo={isDemo}
                />
              </div>
            </div>
            <Separator className="my-2" />
            <SortableContext items={tasksWithoutSection.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2" id="no-section-dropzone">
                {tasksWithoutSection.map(task => renderTask(task, 0, null))}
              </div>
            </SortableContext>
          </div>
        )}

        {/* Add Section Button */}
        <Button
          variant="outline"
          className="w-full py-6 text-lg font-semibold text-muted-foreground hover:text-primary"
          onClick={() => setIsAddSectionDialogOpen(true)}
          disabled={isDemo}
        >
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Section
        </Button>
      </div>

      {/* Add Section Dialog */}
      <Dialog open={isAddSectionDialogOpen} onOpenChange={setIsAddSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
            <DialogDescription>Enter a name for your new task section.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sectionName" className="text-right">
                Name
              </Label>
              <Input
                id="sectionName"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddSectionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSection}>Add Section</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Section Dialog */}
      <Dialog open={isEditSectionDialogOpen} onOpenChange={setIsEditSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
            <DialogDescription>Edit the name and focus mode setting for this section.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editSectionName" className="text-right">
                Name
              </Label>
              <Input
                id="editSectionName"
                value={editingSectionName}
                onChange={(e) => setEditingSectionName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="includeInFocusMode" className="text-right">
                Include in Focus Mode
              </Label>
              <Switch
                id="includeInFocusMode"
                checked={editingSectionIncludeInFocusMode}
                onCheckedChange={setEditingSectionIncludeInFocusMode}
                className="col-span-3"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditSectionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSectionEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <DragOverlay>
        {activeId ? (
          activeTask ? (
            <TaskItem
              task={activeTask}
              allTasks={processedTasks}
              onDelete={deleteTask}
              onUpdate={updateTask}
              sections={sections}
              onOpenOverview={onOpenOverview}
              currentDate={currentDate}
              onMoveUp={() => Promise.resolve()}
              onMoveDown={() => Promise.resolve()}
              level={0}
              isOverlay
              hasSubtasks={getSubtasks(activeTask.id).length > 0}
              isExpanded={expandedTasks[activeTask.id] === undefined ? true : expandedTasks[activeTask.id]}
              toggleTask={toggleTask}
              setFocusTask={setFocusTask}
              isDoToday={activeTask.recurring_type !== 'none' || !doTodayOffIds.has(activeTask.original_task_id || activeTask.id)}
              toggleDoToday={toggleDoToday}
              scheduledTasksMap={scheduledTasksMap}
              isDemo={isDemo}
              expandedTasks={expandedTasks} // Pass expandedTasks here
            />
          ) : activeSection ? (
            <div className="rounded-xl border bg-card text-card-foreground shadow-lg p-4 opacity-80">
              <h3 className="text-lg font-semibold">{activeSection.name}</h3>
            </div>
          ) : null
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default TaskList;