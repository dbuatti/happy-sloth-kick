import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { arrayMove } from '@dnd-kit/sortable';
import { format, isSameDay, isPast, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Task, TaskCategory, TaskSection, NewTaskData, UpdateTaskData } from '@/types';
import SortableTaskItem from './SortableTaskItem';
import SortableSectionHeader from './SortableSectionHeader';
import TaskFilter from './TaskFilter';
import AddTaskForm from './AddTaskForm';
import ManageCategoriesDialog from './ManageCategoriesDialog';
import ManageSectionsDialog from './ManageSectionsDialog';
import TaskItem from './TaskItem'; // For DragOverlay
import { toast } from 'react-hot-toast';

interface TaskListProps {
  tasks: Task[];
  categories: TaskCategory[];
  sections: TaskSection[];
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddTask: (
    description: string,
    sectionId: string | null,
    parentTaskId: string | null,
    dueDate: Date | null,
    categoryId: string | null,
    priority: string
  ) => Promise<Task>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<void>;
  onToggleFocusMode: (taskId: string) => void;
  onLogDoTodayOff: (taskId: string) => void;
  createCategory: (data: NewTaskCategoryData) => Promise<TaskCategory>;
  updateCategory: (id: string, updates: UpdateTaskCategoryData) => Promise<TaskCategory>;
  deleteCategory: (id: string) => Promise<void>;
  createSection: (data: NewTaskSectionData) => Promise<TaskSection>;
  updateSection: (data: { id: string; updates: UpdateTaskSectionData }) => Promise<TaskSection>;
  deleteSection: (id: string) => Promise<void>;
  reorderTasks: (activeId: string, overId: string | null, parentTaskId: string | null, sectionId: string | null) => Promise<void>;
  reorderSections: (activeId: string, overId: string | null) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  showFilters?: boolean;
  showSections?: boolean;
  showCompleted?: boolean;
  currentDate: Date;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  categories,
  sections,
  onUpdateTask,
  onDeleteTask,
  onAddTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
  createCategory,
  updateCategory,
  deleteCategory,
  createSection,
  updateSection,
  deleteSection,
  reorderTasks,
  reorderSections,
  updateSectionIncludeInFocusMode,
  showFilters = true,
  showSections = true,
  showCompleted = false,
  currentDate,
}) => {
  const [isAddTaskSheetOpen, setIsAddTaskSheetOpen] = useState(false);
  const [isManageCategoriesDialogOpen, setIsManageCategoriesDialogOpen] = useState(false);
  const [isManageSectionsDialogOpen, setIsManageSectionsDialogOpen] = useState(false);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDueDate, setFilterDueDate] = useState<Date | undefined>(undefined);
  const [internalShowCompleted, setInternalShowCompleted] = useState<boolean>(showCompleted);

  useEffect(() => {
    setInternalShowCompleted(showCompleted);
  }, [showCompleted]);

  const filteredAndSortedTasks = useMemo(() => {
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
      filtered = filtered.filter(task => task.due_date && isSameDay(new Date(task.due_date), filterDueDate));
    }

    if (!internalShowCompleted) {
      filtered = filtered.filter(task => task.status !== 'completed');
    }

    // Sort by due date (closest first), then priority, then order
    filtered.sort((a, b) => {
      // Sort by due date
      if (a.due_date && b.due_date) {
        const dateA = new Date(a.due_date);
        const dateB = new Date(b.due_date);
        if (isPast(dateA) && !isPast(dateB)) return 1; // Past dates come after future dates
        if (!isPast(dateA) && isPast(dateB)) return -1;
        return dateA.getTime() - dateB.getTime();
      }
      if (a.due_date) return -1; // Tasks with due dates come before tasks without
      if (b.due_date) return 1;

      // Then by priority (urgent > high > medium > low > none)
      const priorityOrder: { [key: string]: number } = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3, 'none': 4 };
      const pA = priorityOrder[a.priority || 'none'];
      const pB = priorityOrder[b.priority || 'none'];
      if (pA !== pB) return pA - pB;

      // Finally by explicit order
      if (a.order !== null && b.order !== null) {
        return a.order - b.order;
      }
      return 0;
    });

    return filtered;
  }, [tasks, filterStatus, filterCategory, filterPriority, searchQuery, filterDueDate, internalShowCompleted]);

  const tasksBySection = useMemo(() => {
    const map = new Map<string, Task[]>();
    sections.forEach(section => map.set(section.id, []));
    map.set('no-section', []); // For tasks without a section

    filteredAndSortedTasks.forEach(task => {
      if (task.parent_task_id === null) { // Only top-level tasks go into sections
        if (task.section_id && map.has(task.section_id)) {
          map.get(task.section_id)?.push(task);
        } else {
          map.get('no-section')?.push(task);
        }
      }
    });

    // Sort tasks within each section by their order property
    map.forEach((taskList, sectionId) => {
      map.set(sectionId, taskList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    });

    return map;
  }, [filteredAndSortedTasks, sections]);

  const getSubtasks = useCallback((parentTaskId: string) => {
    return filteredAndSortedTasks.filter(task => task.parent_task_id === parentTaskId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [filteredAndSortedTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: ({ currentCoordinates }) => currentCoordinates,
    })
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTask = useMemo(() => tasks.find(task => task.id === activeId), [tasks, activeId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const draggedTask = tasks.find(t => t.id === activeId);
    if (!draggedTask) return;

    const overItem = tasks.find(t => t.id === overId) || sections.find(s => s.id === overId);

    let newParentTaskId: string | null = null;
    let newSectionId: string | null = draggedTask.section_id;
    let newOrder: number = draggedTask.order || 0;

    if (overItem && 'status' in overItem) { // Dropped onto another task
      const targetTask = overItem as Task;
      const rect = (event.activatorEvent?.target as HTMLElement)?.getBoundingClientRect();
      const isDroppedOnBottomHalf = rect && event.activatorEvent && 'clientY' in event.activatorEvent ? event.activatorEvent.clientY > rect.bottom - rect.height / 2 : false;

      if (isDroppedOnBottomHalf) { // Drop as subtask
        newParentTaskId = targetTask.id;
        newSectionId = targetTask.section_id; // Subtasks inherit section from parent
        const subtasksOfTarget = tasks.filter(t => t.parent_task_id === targetTask.id);
        newOrder = subtasksOfTarget.length; // Add to end of subtasks
      } else { // Drop as a sibling
        newParentTaskId = targetTask.parent_task_id;
        newSectionId = targetTask.section_id;
        const siblings = tasks.filter(t => t.parent_task_id === newParentTaskId && t.section_id === newSectionId);
        const overIndex = siblings.findIndex(t => t.id === overId);
        const newSiblings = arrayMove(siblings, siblings.findIndex(t => t.id === activeId), overIndex);
        newOrder = newSiblings.findIndex(t => t.id === activeId);
      }
    } else if (overItem && 'name' in overItem) { // Dropped onto a section header
      const targetSection = overItem as TaskSection;
      newSectionId = targetSection.id;
      newParentTaskId = null; // Top-level task in this section
      const topLevelTasksInSection = tasks.filter(t => t.section_id === newSectionId && t.parent_task_id === null);
      newOrder = topLevelTasksInSection.length; // Add to end of section
    } else { // Dropped into general area (no specific target)
      newParentTaskId = null;
      newSectionId = draggedTask.section_id; // Keep original section if dropped into general area
      const topLevelTasks = tasks.filter(t => t.section_id === newSectionId && t.parent_task_id === null);
      newOrder = topLevelTasks.length; // Add to end of top-level tasks in its section
    }

    await onUpdateTask(draggedTask.id, {
      parent_task_id: newParentTaskId,
      section_id: newSectionId,
      order: newOrder,
    });

    // Re-evaluate order for affected siblings/subtasks if needed
    // This is a simplified reorder. A more robust solution would involve re-indexing all affected items.
    // For now, we rely on the backend's update_tasks_order RPC to handle full reordering.
  };

  const handleAddTaskFormSubmit = async (
    description: string,
    sectionId: string | null,
    parentTaskId: string | null,
    dueDate: Date | null,
    categoryId: string | null,
    priority: string
  ) => {
    await onAddTask(description, sectionId, parentTaskId, dueDate, categoryId, priority);
  };

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
          showCompleted={internalShowCompleted}
          setShowCompleted={setInternalShowCompleted}
          categories={categories}
          sections={sections}
        />
      )}

      <div className="flex justify-end space-x-2">
        <Button onClick={() => setIsManageCategoriesDialogOpen(true)} variant="outline">
          Manage Categories
        </Button>
        <Button onClick={() => setIsManageSectionsDialogOpen(true)} variant="outline">
          Manage Sections
        </Button>
        <Button onClick={() => setIsAddTaskSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
        onDragStart={({ active }) => setActiveId(String(active.id))}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="space-y-6">
          {showSections && sections.map(section => (
            <div key={section.id}>
              <SortableSectionHeader
                section={section}
                onUpdateSection={({ id, updates }) => updateSection(id, updates)} // Corrected call
                onDeleteSection={deleteSection}
                onUpdateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
              />
              <SortableContext items={tasksBySection.get(section.id)?.map(task => task.id) || []} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 mt-3">
                  {tasksBySection.get(section.id)?.map(task => (
                    <React.Fragment key={task.id}>
                      <SortableTaskItem
                        task={task}
                        categories={categories}
                        sections={sections}
                        onUpdateTask={onUpdateTask}
                        onDeleteTask={onDeleteTask}
                        onAddSubtask={onAddSubtask}
                        onToggleFocusMode={onToggleFocusMode}
                        onLogDoTodayOff={onLogDoTodayOff}
                      />
                      {getSubtasks(task.id).map(subtask => (
                        <div key={subtask.id} className="ml-8">
                          <SortableTaskItem
                            task={subtask}
                            categories={categories}
                            sections={sections}
                            onUpdateTask={onUpdateTask}
                            onDeleteTask={onDeleteTask}
                            onAddSubtask={onAddSubtask}
                            onToggleFocusMode={onToggleFocusMode}
                            onLogDoTodayOff={onLogDoTodayOff}
                          />
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </SortableContext>
            </div>
          ))}

          {tasksBySection.get('no-section')?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3">No Section</h3>
              <SortableContext items={tasksBySection.get('no-section')?.map(task => task.id) || []} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {tasksBySection.get('no-section')?.map(task => (
                    <React.Fragment key={task.id}>
                      <SortableTaskItem
                        task={task}
                        categories={categories}
                        sections={sections}
                        onUpdateTask={onUpdateTask}
                        onDeleteTask={onDeleteTask}
                        onAddSubtask={onAddSubtask}
                        onToggleFocusMode={onToggleFocusMode}
                        onLogDoTodayOff={onLogDoTodayOff}
                      />
                      {getSubtasks(task.id).map(subtask => (
                        <div key={subtask.id} className="ml-8">
                          <SortableTaskItem
                            task={subtask}
                            categories={categories}
                            sections={sections}
                            onUpdateTask={onUpdateTask}
                            onDeleteTask={onDeleteTask}
                            onAddSubtask={onAddSubtask}
                            onToggleFocusMode={onToggleFocusMode}
                            onLogDoTodayOff={onLogDoTodayOff}
                          />
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </SortableContext>
            </div>
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
              onAddSubtask={onAddSubtask}
              onToggleFocusMode={onToggleFocusMode}
              onLogDoTodayOff={onLogDoTodayOff}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <ManageCategoriesDialog
        isOpen={isManageCategoriesDialogOpen}
        onOpenChange={setIsManageCategoriesDialogOpen}
        categories={categories}
        onCreateCategory={createCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
      />

      <ManageSectionsDialog
        isOpen={isManageSectionsDialogOpen}
        onOpenChange={setIsManageSectionsDialogOpen}
        sections={sections}
        onCreateSection={createSection}
        onUpdateSection={({ id, updates }) => updateSection(id, updates)} // Corrected call
        onDeleteSection={deleteSection}
        onUpdateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
      />

      <Sheet open={isAddTaskSheetOpen} onOpenChange={setIsAddTaskSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add New Task</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <AddTaskForm
              onAddTask={handleAddTaskFormSubmit}
              onTaskAdded={() => setIsAddTaskSheetOpen(false)}
              categories={categories}
              sections={sections}
              currentDate={currentDate}
              createSection={createSection}
              updateSection={({ id, updates }) => updateSection(id, updates)} // Corrected call
              deleteSection={deleteSection}
              updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
              showCompleted={internalShowCompleted}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TaskList;