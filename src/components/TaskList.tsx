import React, { useState, useCallback, useMemo } from 'react';
import SortableTaskItem from '@/components/SortableTaskItem';
import { Task, TaskSection } from '@/hooks/useTasks';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, UniqueIdentifier, SensorContext, DragOverEvent } from '@dnd-kit/core'; // Removed DragStartEvent
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

interface TaskListProps {
  processedTasks: Task[];
  filteredTasks: Task[];
  loading: boolean;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  deleteTask: (taskId: string) => Promise<boolean | undefined>;
  markAllTasksInSectionCompleted: (sectionId: string) => Promise<void>;
  sections: TaskSection[];
  createSection: (name: string) => Promise<void>;
  updateTaskParentAndOrder: (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null, isDraggingDown: boolean) => Promise<void>;
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  expandedSections: Record<string, boolean>;
  expandedTasks: Record<string, boolean>;
  toggleTask: (taskId: string) => void;
  toggleSection: (sectionId: string) => void;
  setFocusTask: (taskId: string | null) => Promise<void>;
  doTodayOffIds: Set<string>;
  toggleDoToday: (task: Task) => Promise<void>;
  scheduledTasksMap: Map<string, any>;
  isDemo?: boolean;
  selectedTaskIds: Set<string>;
  onSelectTask: (taskId: string, isSelected: boolean) => void;
  onOpenAddTaskDialog: (parentTaskId: string | null, sectionId: string | null) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  processedTasks,
  filteredTasks,
  loading,
  updateTask,
  deleteTask,
  markAllTasksInSectionCompleted,
  sections,
  createSection,
  updateTaskParentAndOrder,
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
  onOpenAddTaskDialog,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event: KeyboardEvent, { currentCoordinates }: { active: UniqueIdentifier; currentCoordinates: { x: number; y: number }; context: SensorContext; }) => {
        if (event.code === 'Space') {
          return currentCoordinates;
        }
        return undefined;
      },
    })
  );

  const [isNewSectionDialogOpen, setIsNewSectionDialogOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [insertionIndicator, setInsertionIndicator] = useState<{ id: UniqueIdentifier; position: 'before' | 'after' | 'into' } | null>(null);

  const handleCreateSection = useCallback(async () => {
    if (newSectionName.trim()) {
      await createSection(newSectionName.trim());
      setNewSectionName('');
      setIsNewSectionDialogOpen(false);
    }
  }, [createSection, newSectionName]);

  const sectionsWithTasks = useMemo(() => {
    const sectionMap = new Map<string, TaskSection>(sections.map(s => [s.id, s]));
    const tasksBySection = new Map<string, Task[]>();
    const unsectionedTasks: Task[] = [];

    filteredTasks.forEach(task => {
      if (task.section_id && sectionMap.has(task.section_id)) {
        if (!tasksBySection.has(task.section_id)) {
          tasksBySection.set(task.section_id, []);
        }
        tasksBySection.get(task.section_id)?.push(task);
      } else if (task.parent_task_id === null) {
        unsectionedTasks.push(task);
      }
    });

    const result: { section: TaskSection | null; tasks: Task[] }[] = [];

    if (unsectionedTasks.length > 0) {
      result.push({ section: null, tasks: unsectionedTasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) });
    }

    sections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).forEach(section => {
      const tasks = tasksBySection.get(section.id) || [];
      if (tasks.length > 0) {
        result.push({ section, tasks: tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) });
      }
    });

    return result;
  }, [filteredTasks, sections]);

  const findTask = useCallback((id: string) => {
    return processedTasks.find(task => task.id === id);
  }, [processedTasks]);

  const handleDragStart = useCallback(() => {
    setInsertionIndicator(null); // Clear any previous indicator on drag start
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setInsertionIndicator(null);
      return;
    }

    const activeTask = findTask(String(active.id));
    const overItem = findTask(String(over.id)) || sections.find(s => s.id === String(over.id));

    if (!activeTask || !overItem) {
      setInsertionIndicator(null);
      return;
    }

    const isOverTask = (item: any): item is Task => 'description' in item;
    const isOverSection = (item: any): item is TaskSection => 'name' in item && !('description' in item);

    const overId = String(over.id);

    // Determine if dragging into a section header (empty or not)
    if (isOverSection(overItem)) {
      setInsertionIndicator({ id: overId, position: 'into' });
      return;
    }

    // Determine if dragging into a task (as a subtask)
    // This is a simplified check. A more advanced one would check horizontal position.
    if (isOverTask(overItem) && activeTask.id !== overItem.id && activeTask.parent_task_id !== overItem.id) {
      const overElement = document.getElementById(`task-item-${overId}`);
      if (overElement) {
        const { left, width } = overElement.getBoundingClientRect();
        const mouseX = event.delta.x + left; // Approximate mouse X relative to viewport
        // If mouse is significantly to the right, suggest 'into'
        if (mouseX > left + width * 0.75) { // Adjust threshold as needed
          setInsertionIndicator({ id: overId, position: 'into' });
          return;
        }
      }
    }

    // Determine if dragging before or after a task
    const overElement = document.getElementById(`task-item-${overId}`);
    if (overElement) {
      const { top, height } = overElement.getBoundingClientRect();
      // const middle = top + height / 2; // Removed unused middle variable

      // Use event.delta.y to determine if dragging upwards or downwards
      if (event.delta.y < 0) { // Dragging upwards
        setInsertionIndicator({ id: overId, position: 'before' });
      } else { // Dragging downwards
        setInsertionIndicator({ id: overId, position: 'after' });
      }
    } else {
      setInsertionIndicator(null);
    }
  }, [findTask, sections]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setInsertionIndicator(null);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    const indicator = insertionIndicator;

    setInsertionIndicator(null); // Clear indicator immediately

    if (activeId === overId && indicator?.position !== 'into') return; // No change if dropped on self without 'into'

    const activeTask = findTask(activeId);
    if (!activeTask) return;

    let newParentId: string | null = null;
    let newSectionId: string | null = null;
    let targetOverId: string | null = null;
    let isDraggingDown = false; // This will be determined by the indicator position

    const overItem = findTask(overId) || sections.find(s => s.id === overId);

    if (!overItem) return;

    const isOverTask = (item: any): item is Task => 'description' in item;
    const isOverSection = (item: any): item is TaskSection => 'name' in item && !('description' in item);

    if (indicator?.position === 'into') {
      if (isOverTask(overItem)) {
        // Make activeTask a subtask of overItem
        newParentId = overItem.id;
        newSectionId = overItem.section_id; // Inherit section from parent
        targetOverId = null; // No specific sibling to order against, will be appended
      } else if (isOverSection(overItem)) {
        // Make activeTask a top-level task in this section
        newParentId = null;
        newSectionId = overItem.id;
        targetOverId = null; // No specific sibling to order against, will be appended
      }
    } else {
      // Dropped before/after another task
      if (isOverTask(overItem)) {
        newParentId = overItem.parent_task_id;
        newSectionId = overItem.section_id;
        targetOverId = overItem.id;
        isDraggingDown = indicator?.position === 'after';
      } else if (isOverSection(overItem)) {
        // Dropped before/after a section header (treat as appending to section)
        newParentId = null;
        newSectionId = overItem.id;
        targetOverId = null;
        isDraggingDown = true; // Append to end of section
      }
    }

    // Prevent a task from becoming a subtask of itself or its own subtask
    if (newParentId === activeTask.id || (newParentId && findTask(newParentId)?.parent_task_id === activeTask.id)) {
      console.warn("Cannot make a task a subtask of itself or its direct subtask.");
      return;
    }

    // If no change in parent/section and just reordering within the same list
    if (activeTask.parent_task_id === newParentId && activeTask.section_id === newSectionId) {
      const tasksInContext = filteredTasks.filter(task =>
        task.section_id === activeTask.section_id && task.parent_task_id === activeTask.parent_task_id
      ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const oldIndex = tasksInContext.findIndex(task => task.id === activeId);
      const newIndex = tasksInContext.findIndex(task => task.id === targetOverId);

      if (oldIndex === -1 || newIndex === -1) { // If targetOverId is null, it means append
        await updateTaskParentAndOrder(activeId, newParentId, newSectionId, null, true); // Append to end
      } else {
        const movedTasks = arrayMove(tasksInContext, oldIndex, newIndex);
        const overTaskIndex = movedTasks.findIndex(t => t.id === activeId);
        const newOverId = overTaskIndex > 0 ? movedTasks[overTaskIndex - 1].id : null;
        const newIsDraggingDown = overTaskIndex > oldIndex; // If moved down, isDraggingDown is true

        await updateTaskParentAndOrder(activeId, newParentId, newSectionId, newOverId, newIsDraggingDown);
      }
    } else {
      // Moving to a new parent/section
      await updateTaskParentAndOrder(activeId, newParentId, newSectionId, targetOverId, isDraggingDown);
    }

  }, [findTask, filteredTasks, insertionIndicator, sections, updateTaskParentAndOrder]);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>;
  }

  if (filteredTasks.length === 0 && !loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tasks found for this day or matching your filters.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
    >
      <div className="space-y-6">
        {sectionsWithTasks.map(({ section, tasks }) => (
          <div key={section?.id || 'unsectioned'} className="border rounded-lg bg-card shadow-sm">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">
                  {section ? section.name : 'Unsectioned Tasks'}
                </h3>
                {section && (
                  <Button variant="ghost" size="sm" onClick={() => toggleSection(section.id)}>
                    {expandedSections[section.id] === false ? 'Expand' : 'Collapse'}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {section && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllTasksInSectionCompleted(section.id)}
                    disabled={isDemo || tasks.every(t => t.status === 'completed')}
                  >
                    Mark All Completed
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenAddTaskDialog(null, section?.id || null)}
                  disabled={isDemo}
                  aria-label={`Add task to ${section?.name || 'Unsectioned Tasks'}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {(!section || expandedSections[section.id] !== false) && (
              <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <ul className="divide-y divide-border">
                  {tasks.map(task => (
                    <SortableTaskItem
                      key={task.id}
                      task={task}
                      onUpdate={updateTask}
                      onDelete={deleteTask}
                      onOpenOverview={onOpenOverview}
                      currentDate={currentDate}
                      isExpanded={expandedTasks[task.id] === true}
                      toggleTask={toggleTask}
                      setFocusTask={setFocusTask}
                      doTodayOffIds={doTodayOffIds}
                      toggleDoToday={toggleDoToday}
                      scheduledAppointment={scheduledTasksMap.get(task.id)}
                      isDemo={isDemo}
                      selectedTaskIds={selectedTaskIds}
                      onSelectTask={onSelectTask}
                      allTasks={processedTasks}
                      getSubtasksForTask={(parentTaskId) => processedTasks.filter(t => t.parent_task_id === parentTaskId)}
                      sections={sections}
                      level={0}
                      expandedTasks={expandedTasks}
                      isDoToday={!doTodayOffIds.has(task.original_task_id || task.id)}
                      scheduledTasksMap={scheduledTasksMap}
                      insertionIndicator={insertionIndicator}
                      isSelected={selectedTaskIds.has(task.id)}
                      onAddSubtask={onOpenAddTaskDialog}
                    />
                  ))}
                </ul>
              </SortableContext>
            )}
          </div>
        ))}
        <div className="flex justify-center mt-8">
          <Button variant="outline" onClick={() => setIsNewSectionDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add New Section
          </Button>
        </div>
      </div>

      <Dialog open={isNewSectionDialogOpen} onOpenChange={setIsNewSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Section</DialogTitle>
            <DialogDescription>Enter a name for your new task section.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Section Name"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateSection()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewSectionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSection} disabled={!newSectionName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
};

export default TaskList;