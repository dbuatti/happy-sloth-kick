import React, { useState, useMemo } from 'react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { isSameDay, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Task, TaskCategory, TaskSection, NewTaskData, UpdateTaskData, NewTaskCategoryData, UpdateTaskCategoryData, NewTaskSectionData, UpdateTaskSectionData } from '@/types';
import SortableTaskItem from './SortableTaskItem';
import SortableSectionHeader from './SortableSectionHeader';
import TaskItem from './tasks/TaskItem'; // For DragOverlay
import AddTaskForm from './AddTaskForm';
import ManageCategoriesDialog from './ManageCategoriesDialog';
import ManageSectionsDialog from './ManageSectionsDialog';
import TaskFilter from './TaskFilter';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'react-hot-toast';

interface TaskListProps {
  tasks: Task[];
  categories: TaskCategory[];
  sections: TaskSection[];
  isLoading: boolean;
  error: Error | null;
  onAddTask: (data: NewTaskData) => Promise<Task>;
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  createCategory: (data: NewTaskCategoryData) => Promise<TaskCategory>;
  updateCategory: (id: string, updates: UpdateTaskCategoryData) => Promise<TaskCategory>;
  deleteCategory: (id: string) => Promise<void>;
  createSection: (data: NewTaskSectionData) => Promise<TaskSection>;
  updateSection: (data: { id: string; updates: UpdateTaskSectionData }) => Promise<TaskSection>;
  deleteSection: (id: string) => Promise<void>;
  reorderTasks: (activeId: string, overId: string, parentId: string | null, newSectionId: string | null) => Promise<void>;
  reorderSections: (activeId: string, overId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection>;
  showCompleted: boolean;
  toggleShowCompleted: () => void;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  categories,
  sections,
  isLoading,
  error,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
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
  showCompleted,
  toggleShowCompleted,
}) => {
  const [isAddTaskSheetOpen, setIsAddTaskSheetOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('to-do');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSection, setFilterSection] = useState('all');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: ({ currentCoordinates }) => currentCoordinates!,
    })
  );

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(task => task.category?.id === filterCategory);
    }

    if (filterSection !== 'all') {
      if (filterSection === 'no-section') {
        filtered = filtered.filter(task => task.section_id === null);
      } else {
        filtered = filtered.filter(task => task.section_id === filterSection);
      }
    }

    if (!showCompleted) {
      filtered = filtered.filter(task => task.status !== 'completed');
    }

    return filtered;
  }, [tasks, filterStatus, filterCategory, filterSection, showCompleted]);

  const tasksBySection = useMemo(() => {
    const map = new Map<string, Task[]>();
    sections.forEach(section => map.set(section.id, []));
    map.set('no-section', []); // For tasks without a section

    filteredTasks.forEach(task => {
      if (task.parent_task_id === null) { // Only consider top-level tasks for section grouping
        const sectionKey = task.section_id || 'no-section';
        if (map.has(sectionKey)) {
          map.get(sectionKey)?.push(task);
        } else {
          // This case should ideally not happen if sections are pre-populated, but as a fallback
          map.get('no-section')?.push(task);
        }
      }
    });

    // Sort tasks within each section
    map.forEach(taskList => {
      taskList.sort((a, b) => {
        if (a.order !== null && b.order !== null) {
          return a.order - b.order;
        }
        return 0;
      });
    });

    return map;
  }, [filteredTasks, sections]);

  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [sections]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const draggedTask = tasks.find(t => t.id === activeId);
    const targetTask = tasks.find(t => t.id === overId);
    const targetSection = sections.find(s => s.id === overId);

    if (draggedTask && targetTask) {
      // Task dropped onto another task
      let newParentTaskId: string | null = null;
      let newSectionId: string | null = draggedTask.section_id;
      let newOrder: number = draggedTask.order || 0;

      // Determine if dropped as subtask or sibling
      const rect = (event.activatorEvent?.target as HTMLElement)?.getBoundingClientRect();
      const isDroppedOnBottomHalf = rect && event.activatorEvent && 'clientY' in event.activatorEvent ? event.activatorEvent.clientY > rect.bottom - rect.height / 2 : false;

      if (isDroppedOnBottomHalf && !targetTask.parent_task_id) { // Dropped on bottom half of a top-level task, make it a subtask
        newParentTaskId = targetTask.id;
        newSectionId = targetTask.section_id; // Subtasks inherit section from parent
        const subtasksOfTarget = tasks.filter(t => t.parent_task_id === targetTask.id);
        newOrder = subtasksOfTarget.length > 0 ? Math.max(...subtasksOfTarget.map(t => t.order || 0)) + 1 : 0;
      } else { // Drop as a sibling
        newParentTaskId = targetTask.parent_task_id;
        newSectionId = targetTask.section_id;
        const siblings = tasks.filter(t => t.parent_task_id === newParentTaskId && t.section_id === newSectionId);
        newOrder = siblings.findIndex(t => t.id === targetTask.id) + (isDroppedOnBottomHalf ? 1 : 0);
      }

      await reorderTasks(activeId, overId, newParentTaskId, newSectionId);

    } else if (draggedTask && targetSection) {
      // Task dropped onto a section header
      await reorderTasks(activeId, overId, null, targetSection.id);
    } else if (targetSection && active.data.current?.type === 'task') {
      // Task dropped into an empty section or 'no-section' area
      const targetSectionId = targetSection.id === 'no-section' ? null : targetSection.id;
      await reorderTasks(activeId, overId, null, targetSectionId);
    } else if (sections.some(s => s.id === activeId) && sections.some(s => s.id === overId)) {
      // Section dropped onto another section
      await reorderSections(activeId, overId);
    }

    setActiveId(null);
  };

  const dragOverlayContent = activeId ? (
    tasks.find((task) => task.id === activeId) ? (
      <TaskItem
        task={tasks.find((task) => task.id === activeId)!}
        categories={categories}
        sections={sections}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onAddSubtask={onAddSubtask}
        onToggleFocusMode={onToggleFocusMode}
        onLogDoTodayOff={onLogDoTodayOff}
        isDragging
      />
    ) : null
  ) : null;

  if (isLoading) return <p>Loading tasks...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">My Tasks</h2>
          <div className="flex space-x-2">
            <Button onClick={() => setIsAddTaskSheetOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Task
            </Button>
            <Button variant="outline" onClick={() => setIsManageCategoriesOpen(true)}>
              Manage Categories
            </Button>
            <Button variant="outline" onClick={() => setIsManageSectionsOpen(true)}>
              Manage Sections
            </Button>
            <Button variant="outline" onClick={toggleShowCompleted}>
              {showCompleted ? 'Hide Completed' : 'Show Completed'}
            </Button>
          </div>
        </div>

        <TaskFilter
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          filterSection={filterSection}
          setFilterSection={setFilterSection}
          categories={categories}
          sections={sections}
        />

        <SortableContext items={sortedSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {sortedSections.map((section) => (
            <div key={section.id} className="mb-6">
              <SortableSectionHeader
                id={section.id}
                section={section}
                onUpdateSectionName={async (id, newName) => {
                  const updated = await updateSection({ id, updates: { name: newName } });
                  return updated;
                }}
                onDeleteSection={deleteSection}
                onUpdateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
              />
              <div className="ml-4 border-l-2 border-gray-200 pl-4">
                <SortableContext items={tasksBySection.get(section.id)?.map(t => t.id) || []} strategy={verticalListSortingStrategy}>
                  {tasksBySection.get(section.id)?.map((task) => (
                    <SortableTaskItem
                      key={task.id}
                      id={task.id}
                      task={task}
                      categories={categories}
                      sections={sections}
                      onUpdateTask={onUpdateTask}
                      onDeleteTask={onDeleteTask}
                      onAddSubtask={onAddSubtask}
                      onToggleFocusMode={onToggleFocusMode}
                      onLogDoTodayOff={onLogDoTodayOff}
                      tasks={tasks} // Pass all tasks for subtask rendering
                    />
                  ))}
                </SortableContext>
              </div>
            </div>
          ))}
        </SortableContext>

        {tasksBySection.get('no-section')?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">No Section</h3>
              <div className="ml-4 border-l-2 border-gray-200 pl-4">
                <SortableContext items={tasksBySection.get('no-section')?.map(t => t.id) || []} strategy={verticalListSortingStrategy}>
                  {tasksBySection.get('no-section')?.map((task) => (
                    <SortableTaskItem
                      key={task.id}
                      id={task.id}
                      task={task}
                      categories={categories}
                      sections={sections}
                      onUpdateTask={onUpdateTask}
                      onDeleteTask={onDeleteTask}
                      onAddSubtask={onAddSubtask}
                      onToggleFocusMode={onToggleFocusMode}
                      onLogDoTodayOff={onLogDoTodayOff}
                      tasks={tasks} // Pass all tasks for subtask rendering
                    />
                  ))}
                </SortableContext>
              </div>
            </div>
          )}
      </div>

      <DragOverlay>
        {dragOverlayContent}
      </DragOverlay>

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={categories}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
      />

      <ManageSectionsDialog
        isOpen={isManageSectionsOpen}
        onClose={() => setIsManageSectionsOpen(false)}
        sections={sections}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
      />

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
              currentDate={new Date()}
              createSection={createSection}
              updateSection={updateSection}
              deleteSection={deleteSection}
              updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
              showCompleted={showCompleted}
            />
          </div>
        </SheetContent>
      </Sheet>
    </DndContext>
  );
};

export default TaskList;