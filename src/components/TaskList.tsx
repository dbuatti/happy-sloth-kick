import React, { useState, useCallback, useMemo } from 'react';
import SortableTaskItem from '@/components/SortableTaskItem';
import { Task, TaskSection } from '@/hooks/useTasks';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, UniqueIdentifier, SensorContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
// import { Separator } from '@/components/ui/separator'; // Removed Separator
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
// import { cn } => '@/lib/utils'; // Removed cn import

interface TaskListProps {
  processedTasks: Task[];
  filteredTasks: Task[];
  loading: boolean;
  // handleAddTask: (taskData: NewTaskData) => Promise<any>; // Removed handleAddTask prop
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  deleteTask: (taskId: string) => Promise<boolean | undefined>; // Updated type based on error
  markAllTasksInSectionCompleted: (sectionId: string) => Promise<void>;
  sections: TaskSection[];
  createSection: (name: string) => Promise<void>;
  // updateSection: (sectionId: string, newName: string) => Promise<void>; // Removed unused prop
  // deleteSection: (sectionId: string) => Promise<void>; // Removed unused prop
  // updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>; // Removed unused prop
  updateTaskParentAndOrder: (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null, isDraggingDown: boolean) => Promise<void>; // Updated type based on error
  // allCategories: Category[]; // Removed allCategories prop
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  expandedSections: Record<string, boolean>;
  expandedTasks: Record<string, boolean>;
  toggleTask: (taskId: string) => void;
  toggleSection: (sectionId: string) => void;
  setFocusTask: (taskId: string | null) => Promise<void>; // Updated type based on error
  doTodayOffIds: Set<string>;
  toggleDoToday: (task: Task) => Promise<void>; // Updated type based on error
  scheduledTasksMap: Map<string, any>;
  isDemo?: boolean;
  selectedTaskIds: Set<string>; // Keep this as Set<string>
  onSelectTask: (taskId: string, isSelected: boolean) => void;
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
  const [insertionIndicator, setInsertionIndicator] = useState<{ id: UniqueIdentifier; position: 'before' | 'after' | 'into' } | null>(null); // Added state for insertion indicator

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

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const activeTask = findTask(activeId);
    const overTask = findTask(overId);

    if (!activeTask || !overTask) return;

    const activeSectionId = activeTask.section_id;
    const overSectionId = overTask.section_id;
    const activeParentId = activeTask.parent_task_id;
    const overParentId = overTask.parent_task_id;

    if (activeSectionId === overSectionId && activeParentId === overParentId) {
      const tasksInContext = filteredTasks.filter(task =>
        task.section_id === activeSectionId && task.parent_task_id === activeParentId
      ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const oldIndex = tasksInContext.findIndex(task => task.id === activeId);
      const newIndex = tasksInContext.findIndex(task => task.id === overId);

      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(tasksInContext, oldIndex, newIndex).map((task, index) => ({
        ...task,
        order: index,
      }));

      for (const task of newOrder) {
        if (task.id === activeId) {
          await updateTaskParentAndOrder(task.id, task.parent_task_id, task.section_id, overId, false);
        }
      }
    } else {
      console.log(`Task ${activeId} moved from section ${activeSectionId} (parent ${activeParentId}) to section ${overSectionId} (parent ${overParentId})`);
    }
    setInsertionIndicator(null); // Clear indicator after drag ends
  }, [filteredTasks, processedTasks, findTask, updateTaskParentAndOrder]);

  // Placeholder for onDragOver to update insertionIndicator (full logic would be more complex)
  // const handleDragOver = useCallback((event: DragOverEvent) => {
  //   const { active, over } = event;
  //   if (active && over) {
  //     // Determine position (before, after, into) and set insertionIndicator
  //     setInsertionIndicator({ id: over.id, position: 'after' }); // Simplified for compile fix
  //   }
  // }, []);

  // const handleDragStart = useCallback(() => {
  //   setInsertionIndicator(null); // Clear any previous indicator on drag start
  // }, []);

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
      // onDragOver={handleDragOver} // Uncomment for full drag indicator logic
      // onDragStart={handleDragStart} // Uncomment for full drag indicator logic
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
                      allTasks={processedTasks} // Pass allTasks for subtask rendering
                      getSubtasksForTask={(parentTaskId) => processedTasks.filter(t => t.parent_task_id === parentTaskId)}
                      sections={sections} // Pass sections for dropdowns
                      level={0} // Top-level tasks start at level 0
                      expandedTasks={expandedTasks} // Pass expandedTasks
                      isDoToday={!doTodayOffIds.has(task.original_task_id || task.id)} // Derive isDoToday
                      scheduledTasksMap={scheduledTasksMap} // Pass scheduledTasksMap
                      insertionIndicator={insertionIndicator} // Pass insertion indicator
                      isSelected={selectedTaskIds.has(task.id)} // Pass isSelected
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