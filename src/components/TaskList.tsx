import React, { useState, useCallback, useMemo } from 'react';
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// DND imports
import {
  DndContext,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  PointerSensor,
  closestCorners,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableTaskItem from './SortableTaskItem';
import SortableSectionItem from './SortableSectionItem';
import { Appointment } from '@/hooks/useAppointments';
import TaskSkeleton from './TaskSkeleton'; // Import TaskSkeleton

interface TaskListProps {
  processedTasks: Task[];
  filteredTasks: Task[];
  loading: boolean;
  handleAddTask: (taskData: NewTaskData) => Promise<any>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<any>;
  deleteTask: (id: string) => Promise<any>;
  markAllTasksInSectionCompleted: (sectionId: string) => Promise<any>;
  sections: TaskSection[];
  createSection: (name: string) => Promise<any>;
  updateSection: (id: string, newName: string) => Promise<void>;
  deleteSection: (id: string) => Promise<any>;
  updateSectionIncludeInFocusMode: (id: string, include: boolean) => Promise<any>;
  allCategories: Category[];
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  expandedSections: Record<string, boolean>;
  expandedTasks: Record<string, boolean>;
  toggleTask: (taskId: string) => void;
  toggleSection: (sectionId: string) => void;
  setFocusTask: (taskId: string | null) => Promise<void>;
  doTodayOffIds: Set<string>;
  toggleDoToday: (task: Task) => Promise<void>;
  scheduledTasksMap: Map<string, Appointment>;
  isDemo?: boolean;
  selectedTaskIds: Set<string>;
  onSelectTask: (taskId: string, isSelected: boolean) => void;
  updateTaskParentAndOrder: (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null, isDraggingDown: boolean) => Promise<void>;
  reorderSections: (activeId: string, overId: string) => Promise<void>;
  onOpenAddTaskDialog: (parentTaskId: string | null, sectionId: string | null) => void; // New prop
}

const TaskList: React.FC<TaskListProps> = ({
  processedTasks,
  filteredTasks,
  loading,
  handleAddTask,
  updateTask,
  deleteTask,
  markAllTasksInSectionCompleted,
  sections,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  allCategories,
  onOpenOverview,
  currentDate,
  expandedSections,
  expandedTasks,
  toggleTask,
  toggleSection,
  setFocusTask,
  doTodayOffIds,
  toggleDoToday,
  scheduledTasksMap,
  isDemo = false,
  selectedTaskIds,
  onSelectTask,
  updateTaskParentAndOrder,
  reorderSections,
  onOpenAddTaskDialog, // Destructure new prop
}) => {
  const [newSectionName, setNewSectionName] = useState('');
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState('');
  const [isConfirmDeleteSectionOpen, setIsConfirmDeleteSectionOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<TaskSection | null>(null);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [insertionIndicator, setInsertionIndicator] = useState<{ id: UniqueIdentifier; position: 'before' | 'after' | 'into' } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sectionIds = useMemo(() => new Set(sections.map(s => s.id)), [sections]);
  const tasksWithoutSection = filteredTasks.filter(task => !task.section_id || !sectionIds.has(task.section_id));

  const getTasksForSection = useCallback((sectionId: string | null) => {
    return filteredTasks.filter(task => task.section_id === sectionId && task.parent_task_id === null)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [filteredTasks]);

  const getSubtasksForTask = useCallback((parentTaskId: string) => {
    return filteredTasks.filter(task => task.parent_task_id === parentTaskId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [filteredTasks]);

  const findTask = useCallback((id: UniqueIdentifier) => {
    return processedTasks.find(task => task.id === id);
  }, [processedTasks]);

  const findSection = useCallback((id: UniqueIdentifier) => {
    return sections.find(section => section.id === id);
  }, [sections]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
    setInsertionIndicator(null);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setInsertionIndicator(null);
      return;
    }

    const activeItemData = active.data.current;
    const overItemData = over.data.current;

    if (!activeItemData || !overItemData) {
      setInsertionIndicator(null);
      return;
    }

    const activeType = activeItemData.type;
    const overType = overItemData.type;

    if (activeType === 'task') {
      const activeTask = activeItemData.task as Task;
      const overTask = overType === 'task' ? (overItemData.task as Task) : null;
      const overSection = overType === 'section' ? (overItemData.item as TaskSection) : null;

      if (!activeTask) {
        setInsertionIndicator(null);
        return;
      }

      let pointerY: number | undefined;
      if (event.activatorEvent instanceof MouseEvent) {
        pointerY = event.activatorEvent.clientY;
      } else if (event.activatorEvent instanceof TouchEvent && event.activatorEvent.touches.length > 0) {
        pointerY = event.activatorEvent.touches[0].clientY;
      } else {
        pointerY = undefined;
      }

      if (overTask && overTask.id !== activeTask.id && overTask.parent_task_id !== activeTask.id) {
        const overRect = event.over?.rect;
        if (overRect && pointerY !== undefined) {
          const middleY = overRect.top + overRect.height / 2;
          const quarterHeight = overRect.height / 4;

          if (pointerY > middleY - quarterHeight && pointerY < middleY + quarterHeight) {
            setInsertionIndicator({ id: overTask.id, position: 'into' });
            return;
          }
        }
      }

      if (overTask) {
        const overRect = event.over?.rect;
        if (overRect && pointerY !== undefined) {
          const middleY = overRect.top + overRect.height / 2;
          setInsertionIndicator({ id: overTask.id, position: pointerY < middleY ? 'before' : 'after' });
          return;
        }
      } else if (overSection) {
        setInsertionIndicator({ id: overSection.id, position: 'into' });
        return;
      }
    } else if (activeType === 'section') {
      const overSection = overType === 'section' ? (overItemData.item as TaskSection) : null;
      if (overSection) {
        const overRect = event.over?.rect;
        if (overRect) {
          const middleY = overRect.top + overRect.height / 2;
          let pointerY: number | undefined;
          if (event.activatorEvent instanceof MouseEvent) {
            pointerY = event.activatorEvent.clientY;
          } else if (event.activatorEvent instanceof TouchEvent && event.activatorEvent.touches.length > 0) {
            pointerY = event.activatorEvent.touches[0].clientY;
          } else {
            pointerY = undefined;
          }

          if (pointerY !== undefined) {
            setInsertionIndicator({ id: overSection.id, position: pointerY < middleY ? 'before' : 'after' });
            return;
          }
        }
      }
    }

    setInsertionIndicator(null);
  }, [findTask]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setInsertionIndicator(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeItemData = active.data.current;
    const overItemData = over.data.current;

    if (!activeItemData || !overItemData) return;

    const activeType = activeItemData.type;
    const overType = overItemData.type;

    if (activeType === 'task') {
      const activeTask = activeItemData.task as Task;
      const overTask = overType === 'task' ? (overItemData.task as Task) : null;
      const overSection = overType === 'section' ? (overItemData.item as TaskSection) : null;

      if (!activeTask) return;

      let newParentId: string | null = null;
      let newSectionId: string | null = null;
      let targetOverId: string | null = null;
      let isDraggingDown = false;

      if (insertionIndicator) {
        if (insertionIndicator.position === 'into' && overTask) {
          newParentId = overTask.id;
          newSectionId = overTask.section_id;
          targetOverId = null;
        } else if (insertionIndicator.position === 'into' && overSection) {
          newParentId = null;
          newSectionId = overSection.id;
          targetOverId = null;
        } else if (overTask) {
          newParentId = overTask.parent_task_id;
          newSectionId = overTask.section_id;
          targetOverId = overTask.id;
          const activeIndex = processedTasks.findIndex(t => t.id === active.id);
          const overIndex = processedTasks.findIndex(t => t.id === over.id);
          isDraggingDown = activeIndex < overIndex;
        }
      }

      if (!insertionIndicator && overTask) {
        newParentId = overTask.parent_task_id;
        newSectionId = overTask.section_id;
        targetOverId = overTask.id;
        const activeIndex = processedTasks.findIndex(t => t.id === active.id);
        const overIndex = processedTasks.findIndex(t => t.id === over.id);
        isDraggingDown = activeIndex < overIndex;
      }

      if (overSection && !overTask && insertionIndicator?.position === 'into') {
        newParentId = null;
        newSectionId = overSection.id;
        targetOverId = null;
      }

      if (
        activeTask.parent_task_id !== newParentId ||
        activeTask.section_id !== newSectionId ||
        targetOverId !== null
      ) {
        await updateTaskParentAndOrder(activeTask.id, newParentId, newSectionId, targetOverId, isDraggingDown);
      }
    } else if (activeType === 'section' && overType === 'section') {
      const activeSection = activeItemData.item as TaskSection;
      const overSection = overItemData.item as TaskSection;

      if (activeSection.id !== overSection.id) {
        await reorderSections(activeSection.id, overSection.id);
      }
    }
  }, [findTask, processedTasks, updateTaskParentAndOrder, insertionIndicator, reorderSections]);


  const handleCreateSection = useCallback(async () => {
    if (newSectionName.trim()) {
      setIsCreatingSection(true);
      await createSection(newSectionName.trim());
      setNewSectionName('');
      setIsCreatingSection(false);
    }
  }, [newSectionName, createSection]);

  const handleEditSection = useCallback((section: TaskSection) => {
    setEditSectionId(section.id);
    setEditSectionName(section.name);
  }, []);

  const handleUpdateSection = useCallback(async () => {
    if (editSectionId && editSectionName.trim()) {
      await updateSection(editSectionId, editSectionName.trim());
      setEditSectionId(null);
      setEditSectionName('');
    }
  }, [editSectionId, editSectionName, updateSection]);

  const handleEditSectionNameChange = useCallback((name: string) => {
    setEditSectionName(name);
  }, []);

  const handleDeleteSection = useCallback(async () => {
    if (sectionToDelete) {
      await deleteSection(sectionToDelete.id);
      setIsConfirmDeleteSectionOpen(false);
      setSectionToDelete(null);
    }
  }, [sectionToDelete, deleteSection]);

  const confirmDeleteSection = useCallback((section: TaskSection) => {
    setSectionToDelete(section);
    setIsConfirmDeleteSectionOpen(true);
  }, []);

  const renderTask = useCallback((task: Task, level: number) => {
    const isDoToday = !doTodayOffIds.has(task.original_task_id || task.id);
    const hasSubtasks = getSubtasksForTask(task.id).length > 0;

    return (
      <SortableTaskItem
        key={task.id}
        task={task}
        onUpdate={updateTask}
        onDelete={deleteTask}
        onOpenOverview={onOpenOverview}
        isExpanded={expandedTasks[task.id] === true}
        toggleTask={toggleTask}
        setFocusTask={setFocusTask}
        toggleDoToday={toggleDoToday}
        scheduledAppointment={scheduledTasksMap.get(task.id)}
        isDemo={isDemo}
        isSelected={selectedTaskIds.has(task.id)}
        onSelectTask={onSelectTask}
        allTasks={processedTasks}
        sections={sections}
        currentDate={currentDate}
        level={level}
        isDoToday={isDoToday}
        hasSubtasks={hasSubtasks}
        showDragHandle={true}
        insertionIndicator={insertionIndicator}
        getSubtasksForTask={getSubtasksForTask}
        expandedTasks={expandedTasks}
        scheduledTasksMap={scheduledTasksMap}
        doTodayOffIds={doTodayOffIds}
      />
    );
  }, [updateTask, deleteTask, onOpenOverview, expandedTasks, toggleTask, setFocusTask, toggleDoToday, scheduledTasksMap, isDemo, selectedTaskIds, onSelectTask, processedTasks, sections, currentDate, doTodayOffIds, getSubtasksForTask, insertionIndicator]);

  // Calculate these values directly
  const hasFiltersApplied = filteredTasks.length === 0 && processedTasks.length > 0;
  const showNoTasksMessage = filteredTasks.length === 0 && !loading && !hasFiltersApplied;

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <TaskSkeleton key={index} />
        ))}
      </div>
    );
  }

  const activeTask = activeId ? findTask(activeId) : null;
  const activeSection = activeId ? findSection(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {showNoTasksMessage && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-semibold mb-2">You're all caught up! 🎉</p>
            <p className="mb-4">No tasks for today. Click "Add Task" above to get started!</p>
          </div>
        )}

        {filteredTasks.length === 0 && !loading && hasFiltersApplied && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-semibold mb-2">No tasks match your current filters.</p>
            <p className="mb-4">Try adjusting your filters or clearing them.</p>
          </div>
        )}

        {/* "No Section" block */}
        <SortableSectionItem
          section={{ id: 'no-section', name: 'No Section', order: -1, include_in_focus_mode: true, user_id: 'synthetic' }}
          tasksInThisSection={tasksWithoutSection}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
          editSectionId={editSectionId}
          editSectionName={editSectionName}
          handleUpdateSection={handleUpdateSection}
          handleEditSection={handleEditSection}
          onEditSectionNameChange={handleEditSectionNameChange}
          markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          confirmDeleteSection={confirmDeleteSection}
          isDemo={isDemo}
          renderTask={renderTask}
          insertionIndicator={insertionIndicator}
          onOpenAddTaskDialog={onOpenAddTaskDialog} // Pass new prop
        />

        {/* Mapped sections */}
        <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map(section => {
            const tasksInThisSection = getTasksForSection(section.id);
            return (
              <SortableSectionItem
                key={section.id}
                section={section}
                tasksInThisSection={tasksInThisSection}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
                editSectionId={editSectionId}
                editSectionName={editSectionName}
                handleUpdateSection={handleUpdateSection}
                handleEditSection={handleEditSection}
                onEditSectionNameChange={handleEditSectionNameChange}
                markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
                updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                confirmDeleteSection={confirmDeleteSection}
                isDemo={isDemo}
                renderTask={renderTask}
                insertionIndicator={insertionIndicator}
                onOpenAddTaskDialog={onOpenAddTaskDialog} // Pass new prop
              />
            );
          })}
        </SortableContext>

        <div className="flex items-center gap-2 mt-4 p-2 border rounded-lg bg-background shadow-sm">
          <Input
            type="text"
            placeholder="New section name"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateSection()}
            disabled={isCreatingSection || isDemo || !newSectionName.trim()}
            className="flex-1 h-9 text-base"
          />
          <Button onClick={handleCreateSection} disabled={isCreatingSection || !newSectionName.trim() || isDemo} className="h-9 px-4">
            {isCreatingSection ? 'Creating...' : (
              <>
                <Plus className="h-4 w-4 mr-2" /> Add Section
              </>
            )}
          </Button>
        </div>

        <Dialog open={isConfirmDeleteSectionOpen} onOpenChange={setIsConfirmDeleteSectionOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete Section</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the section "{sectionToDelete?.name}"? All tasks within this section will be moved to "No Section". This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmDeleteSectionOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteSection}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {createPortal(
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <SortableTaskItem
              task={activeTask}
              allTasks={processedTasks}
              onDelete={deleteTask}
              onUpdate={updateTask}
              sections={sections}
              onOpenOverview={onOpenOverview}
              currentDate={currentDate}
              level={0}
              isOverlay={true}
              setFocusTask={setFocusTask}
              isDoToday={!doTodayOffIds.has(activeTask.original_task_id || activeTask.id)}
              toggleDoToday={toggleDoToday}
              doTodayOffIds={doTodayOffIds}
              scheduledAppointment={scheduledTasksMap.get(activeTask.id)}
              isDemo={isDemo}
              showDragHandle={true}
              isSelected={false}
              onSelectTask={() => {}}
              expandedTasks={expandedTasks}
              toggleTask={toggleTask}
              insertionIndicator={null}
              getSubtasksForTask={getSubtasksForTask}
              scheduledTasksMap={scheduledTasksMap}
            />
          ) : activeSection ? (
            <SortableSectionItem
              section={activeSection}
              tasksInThisSection={getTasksForSection(activeSection.id)}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              editSectionId={null}
              editSectionName={''}
              handleUpdateSection={async () => {}}
              handleEditSection={() => {}}
              onEditSectionNameChange={() => {}}
              markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
              updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
              confirmDeleteSection={confirmDeleteSection}
              isDemo={isDemo}
              renderTask={renderTask}
              insertionIndicator={null}
              onOpenAddTaskDialog={() => {}} // Dummy for overlay
            />
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
};

export default TaskList;