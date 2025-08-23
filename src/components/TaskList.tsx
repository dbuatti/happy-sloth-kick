import React, { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Task, TaskCategory, TaskSection, NewTaskData, UpdateTaskData, TaskStatus } from '@/types'; // Corrected imports
import SortableTaskItem from './SortableTaskItem';
import AddTaskForm from './AddTaskForm';
import ManageCategoriesDialog from './ManageCategoriesDialog';
import ManageSectionsDialog from './ManageSectionsDialog';
import TaskFilter from './TaskFilter';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Added Card imports

interface TaskListProps {
  tasks: Task[];
  categories: TaskCategory[];
  sections: TaskSection[];
  onAddTask: (data: NewTaskData) => Promise<Task>;
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onCreateCategory: (data: NewTaskCategoryData) => Promise<TaskCategory>;
  onUpdateCategory: (id: string, updates: UpdateTaskCategoryData) => Promise<TaskCategory>;
  onDeleteCategory: (id: string) => Promise<void>;
  createSection: (data: NewTaskSectionData) => Promise<TaskSection>;
  updateSection: (data: { id: string; updates: UpdateTaskSectionData }) => Promise<TaskSection>;
  deleteSection: (id: string) => Promise<void>;
  reorderTasks: (activeId: string, overId: string | null, parentTaskId: string | null, sectionId: string | null) => Promise<void>;
  reorderSections: (activeId: string, overId: string | null) => Promise<void>;
  onToggleFocusMode: (taskId: string) => void;
  onLogDoTodayOff: (taskId: string) => void;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  currentDate: Date;
  showCompleted: boolean;
  showFilters?: boolean;
  showSections?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  categories,
  sections,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  createSection,
  updateSection,
  deleteSection,
  reorderTasks,
  reorderSections,
  onToggleFocusMode,
  onLogDoTodayOff,
  updateSectionIncludeInFocusMode,
  currentDate,
  showCompleted,
  showFilters = true,
  showSections = true,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDueDate, setFilterDueDate] = useState<Date | undefined>(undefined);
  const [isAddTaskSheetOpen, setIsAddTaskSheetOpen] = useState(false);
  const [isManageCategoriesDialogOpen, setIsManageCategoriesDialogOpen] = useState(false);
  const [isManageSectionsDialogOpen, setIsManageSectionsDialogOpen] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: ({ currentCoordinates }) => currentCoordinates,
    })
  );

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(task => task.category === filterCategory);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterDueDate) {
      filtered = filtered.filter(task => task.due_date && new Date(task.due_date).toDateString() === filterDueDate.toDateString());
    }

    if (!showCompleted) {
      filtered = filtered.filter(task => task.status !== 'completed');
    }

    return filtered;
  }, [tasks, filterStatus, filterCategory, filterPriority, searchQuery, filterDueDate, showCompleted]);

  const tasksBySection = useMemo(() => {
    const map = new Map<string, Task[]>();
    sections.forEach(section => map.set(section.id, []));
    map.set('no-section', []); // For tasks without a section

    filteredTasks.forEach(task => {
      if (task.parent_task_id === null) { // Only top-level tasks for sections
        if (task.section_id && map.has(task.section_id)) {
          map.get(task.section_id)?.push(task);
        } else {
          map.get('no-section')?.push(task);
        }
      }
    });

    // Sort tasks within each section by their order property
    map.forEach((taskList) => {
      taskList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });

    return map;
  }, [filteredTasks, sections]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const draggedTask = tasks.find(task => task.id === activeId);
    if (!draggedTask) return;

    let newParentTaskId: string | null = null;
    let newSectionId: string | null = draggedTask.section_id || null;
    let newOrder: number = draggedTask.order ?? 0;

    const targetTask = tasks.find(task => task.id === overId);
    const targetSection = sections.find(section => section.id === overId);

    if (targetTask) {
      // Dropped onto another task (potentially as a subtask or sibling)
      const rect = (event.activatorEvent as any).target.getBoundingClientRect(); // Cast to any to access getBoundingClientRect
      const isDroppedOnBottomHalf = (event.activatorEvent as any).clientY > rect.bottom - rect.height / 2; // Cast to any to access clientY

      if (isDroppedOnBottomHalf) {
        // Drop as a sibling below the target task
        newParentTaskId = targetTask.parent_task_id;
        newSectionId = targetTask.section_id;
        const siblings = tasks.filter(t => t.parent_task_id === newParentTaskId && t.section_id === newSectionId);
        const targetIndex = siblings.findIndex(t => t.id === targetTask.id);
        const newIndex = targetIndex + 1;
        const reorderedSiblings = arrayMove(siblings, siblings.findIndex(t => t.id === draggedTask.id), newIndex);
        newOrder = newIndex; // This order will be adjusted by reorderTasks
        await reorderTasks(draggedTask.id, targetTask.id, newParentTaskId, newSectionId);
      } else {
        // Drop as a subtask of the target task
        newParentTaskId = targetTask.id;
        newSectionId = targetTask.section_id; // Subtasks inherit section from parent
        const subtasksOfTarget = tasks.filter(t => t.parent_task_id === targetTask.id);
        newOrder = subtasksOfTarget.length; // Place at the end of subtasks
        await reorderTasks(draggedTask.id, null, newParentTaskId, newSectionId); // Pass null for overId when becoming subtask
      }
    } else if (targetSection) {
      // Dropped onto a section header
      newParentTaskId = null;
      newSectionId = targetSection.id;
      const topLevelTasksInSection = tasks.filter(t => t.section_id === newSectionId && t.parent_task_id === null);
      newOrder = topLevelTasksInSection.length; // Place at the end of the section
      await reorderTasks(draggedTask.id, null, newParentTaskId, newSectionId);
    } else {
      // Dropped into general area (no specific target)
      newParentTaskId = null;
      newSectionId = draggedTask.section_id; // Keep original section if dropped into general area
      const topLevelTasks = tasks.filter(t => t.section_id === newSectionId && t.parent_task_id === null);
      newOrder = topLevelTasks.length; // Place at the end of top-level tasks in its section
      await reorderTasks(draggedTask.id, null, newParentTaskId, newSectionId);
    }

    setActiveId(null);
  };

  const activeTask = activeId ? tasks.find(task => task.id === activeId) : null;

  return (
    <div className="space-y-6">
      {showFilters && (
        <TaskFilter
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          filterPriority={filterPriority}
          setFilterPriority={setFilterPriority}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterDueDate={filterDueDate}
          setFilterDueDate={setFilterDueDate}
          showCompleted={showCompleted}
          setShowCompleted={setShowCompleted}
          categories={categories}
          sections={sections}
        />
      )}

      <div className="flex justify-end space-x-2 mb-4">
        <Button onClick={() => setIsManageCategoriesDialogOpen(true)} variant="outline">
          <Filter className="mr-2 h-4 w-4" /> Manage Categories
        </Button>
        {showSections && (
          <Button onClick={() => setIsManageSectionsDialogOpen(true)} variant="outline">
            <Filter className="mr-2 h-4 w-4" /> Manage Sections
          </Button>
        )}
        <Button onClick={() => setIsAddTaskSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
      >
        <div className="space-y-4">
          {showSections ? (
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {sections.map(section => (
                <Card key={section.id} className="mb-4">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{section.name}</CardTitle>
                    {/* Add section actions here if needed */}
                  </CardHeader>
                  <CardContent>
                    <SortableContext items={tasksBySection.get(section.id)?.map(t => t.id) || []} strategy={verticalListSortingStrategy}>
                      {tasksBySection.get(section.id)?.map(task => (
                        <SortableTaskItem
                          key={task.id}
                          task={task}
                          categories={categories}
                          sections={sections}
                          onUpdateTask={onUpdateTask}
                          onDeleteTask={onDeleteTask}
                          onAddSubtask={onAddTask} // Pass onAddTask for subtasks
                          onToggleFocusMode={onToggleFocusMode}
                          onLogDoTodayOff={onLogDoTodayOff}
                        />
                      ))}
                    </SortableContext>
                  </CardContent>
                </Card>
              ))}
              {tasksBySection.get('no-section')?.length > 0 && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle>No Section</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SortableContext items={tasksBySection.get('no-section')?.map(t => t.id) || []} strategy={verticalListSortingStrategy}>
                      {tasksBySection.get('no-section')?.map(task => (
                        <SortableTaskItem
                          key={task.id}
                          task={task}
                          categories={categories}
                          sections={sections}
                          onUpdateTask={onUpdateTask}
                          onDeleteTask={onDeleteTask}
                          onAddSubtask={onAddTask} // Pass onAddTask for subtasks
                          onToggleFocusMode={onToggleFocusMode}
                          onLogDoTodayOff={onLogDoTodayOff}
                        />
                      ))}
                    </SortableContext>
                  </CardContent>
                </Card>
              )}
            </SortableContext>
          ) : (
            <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {filteredTasks.map(task => (
                <SortableTaskItem
                  key={task.id}
                  task={task}
                  categories={categories}
                  sections={sections}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onAddSubtask={onAddTask} // Pass onAddTask for subtasks
                  onToggleFocusMode={onToggleFocusMode}
                  onLogDoTodayOff={onLogDoTodayOff}
                />
              ))}
            </SortableContext>
          )}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskItem
              task={activeTask}
              categories={categories}
              sections={sections}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onAddSubtask={onAddTask}
              onToggleFocusMode={onToggleFocusMode}
              onLogDoTodayOff={onLogDoTodayOff}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <Sheet open={isAddTaskSheetOpen} onOpenChange={setIsAddTaskSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add New Task</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <AddTaskForm
              onAddTask={onAddTask}
              onTaskAdded={() => setIsAddTaskSheetOpen(false)}
              categories={categories}
              sections={sections}
              currentDate={currentDate}
              createSection={createSection}
              updateSection={updateSection}
              deleteSection={deleteSection}
              updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
              showCompleted={showCompleted}
            />
          </div>
        </SheetContent>
      </Sheet>

      <ManageCategoriesDialog
        isOpen={isManageCategoriesDialogOpen}
        onOpenChange={setIsManageCategoriesDialogOpen}
        categories={categories}
        onCreateCategory={onCreateCategory}
        onUpdateCategory={onUpdateCategory}
        onDeleteCategory={onDeleteCategory}
      />

      <ManageSectionsDialog
        isOpen={isManageSectionsDialogOpen}
        onOpenChange={setIsManageSectionsDialogOpen}
        sections={sections}
        onCreateSection={createSection}
        onUpdateSection={updateSection}
        onDeleteSection={deleteSection}
        onUpdateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
      />
    </div>
  );
};

export default TaskList;