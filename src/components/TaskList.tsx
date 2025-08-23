import React, { useState, useMemo } from 'react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { isSameDay, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Task, TaskCategory, TaskSection, NewTaskData, UpdateTaskData, NewTaskCategoryData, UpdateTaskCategoryData, NewTaskSectionData, UpdateTaskSectionData, TaskListProps, DoTodayOffLogEntry } from '@/types';
import SortableTaskItem from './SortableTaskItem';
import SortableSectionHeader from './SortableSectionHeader';
import AddTaskForm from './AddTaskForm';
import ManageCategoriesDialog from './ManageCategoriesDialog';
import ManageSectionsDialog from './ManageSectionsDialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'react-hot-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';

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
  updateSectionIncludeInFocusMode,
  showCompleted,
  filterCategory: initialFilterCategory = 'all',
  doTodayOffLog,
}) => {
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [isAddTaskSheetOpen, setIsAddTaskSheetOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState(initialFilterCategory);
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: ({ currentCoordinates }) => currentCoordinates!,
    })
  );

  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(task => showCompleted || task.status !== 'completed');

    if (filterCategory !== 'all') {
      filtered = filtered.filter(task => task.category?.id === filterCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [tasks, showCompleted, filterCategory, searchQuery]);

  const tasksBySection = useMemo(() => {
    const map = new Map<string, Task[]>();
    sections.forEach(section => map.set(section.id, []));
    map.set('no-section', []); // For tasks without a section

    filteredTasks.forEach(task => {
      if (!task.parent_task_id) { // Only top-level tasks go into sections directly
        const sectionId = task.section_id || 'no-section';
        map.get(sectionId)?.push(task);
      }
    });

    // Sort tasks within each section
    map.forEach((taskList, sectionId) => {
      map.set(sectionId, [...taskList].sort((a, b) => {
        if (a.order !== null && b.order !== null) {
          return a.order - b.order;
        }
        return 0;
      }));
    });

    return map;
  }, [filteredTasks, sections]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Handle section reordering
    if (activeId.startsWith('section-') && overId.startsWith('section-')) {
      const oldIndex = sections.findIndex(s => `section-${s.id}` === activeId);
      const newIndex = sections.findIndex(s => `section-${s.id}` === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sections, oldIndex, newIndex);
        const updates = newOrder.map((s, index) => ({
          id: s.id,
          order: index,
          name: s.name,
          include_in_focus_mode: s.include_in_focus_mode,
        }));
        try {
          // Optimistic update
          queryClient.setQueryData(['task_sections', currentUserId], newOrder);
          await updateSectionIncludeInFocusMode(updates[0].id, updates[0].include_in_focus_mode ?? true); // This is a placeholder, actual reorder logic needs to be implemented
          toast.success('Sections reordered!');
        } catch (error) {
          toast.error('Failed to reorder sections.');
          console.error('Error reordering sections:', error);
          queryClient.invalidateQueries({ queryKey: ['task_sections', currentUserId] }); // Rollback
        }
      }
      return;
    }

    // Handle task reordering
    const draggedTask = tasks.find(t => t.id === activeId);
    if (!draggedTask) return;

    let newParentTaskId: string | null = null;
    let newSectionId: string | null = draggedTask.section_id || null;
    let newOrder: number = draggedTask.order || 0;

    const targetSectionId = overId.startsWith('section-') ? overId.replace('section-', '') : null;
    const targetTask = tasks.find(t => t.id === overId);

    if (targetSectionId) { // Dropped on a section header
      newSectionId = targetSectionId;
      newParentTaskId = null;
      const tasksInSection = tasksBySection.get(targetSectionId) || [];
      newOrder = tasksInSection.length > 0 ? Math.max(...tasksInSection.map(t => t.order || 0)) + 1 : 0;
    } else if (targetTask) { // Dropped on another task
      const rect = (event.activatorEvent?.target as HTMLElement)?.getBoundingClientRect();
      const isDroppedOnBottomHalf = rect && event.activatorEvent && 'clientY' in event.activatorEvent ? event.activatorEvent.clientY > rect.bottom - rect.height / 2 : false;

      if (isDroppedOnBottomHalf && !targetTask.parent_task_id) { // Drop as subtask
        newParentTaskId = targetTask.id;
        newSectionId = targetTask.section_id || null; // Subtasks inherit section from parent
        const subtasksOfTarget = tasks.filter(t => t.parent_task_id === targetTask.id);
        newOrder = subtasksOfTarget.length > 0 ? Math.max(...subtasksOfTarget.map(t => t.order || 0)) + 1 : 0;
      } else { // Drop as a sibling
        newParentTaskId = targetTask.parent_task_id || null;
        newSectionId = targetTask.section_id || null;
        const siblings = tasks.filter(t => t.parent_task_id === newParentTaskId && t.section_id === newSectionId);
        const targetOrder = targetTask.order || 0;
        newOrder = targetOrder + (isDroppedOnBottomHalf ? 1 : -1); // Adjust order based on drop position
        // Re-order siblings to make space
        siblings.filter(t => t.id !== draggedTask.id && (isDroppedOnBottomHalf ? (t.order || 0) >= newOrder : (t.order || 0) <= newOrder))
          .forEach(t => {
            onUpdateTask(t.id, { order: (t.order || 0) + (isDroppedOnBottomHalf ? 1 : -1) });
          });
      }
    } else { // Dropped in "no-section" area
      newSectionId = null;
      newParentTaskId = null;
      const tasksInNoSection = tasksBySection.get('no-section') || [];
      newOrder = tasksInNoSection.length > 0 ? Math.max(...tasksInNoSection.map(t => t.order || 0)) + 1 : 0;
    }

    try {
      await onUpdateTask(draggedTask.id, {
        section_id: newSectionId,
        parent_task_id: newParentTaskId,
        order: newOrder,
      });
      toast.success('Task reordered!');
    } catch (error) {
      toast.error('Failed to reorder task.');
      console.error('Error reordering task:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Button onClick={() => setIsAddTaskSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Task
          </Button>
          <Button variant="outline" onClick={() => setIsManageCategoriesOpen(true)}>Manage Categories</Button>
          <Button variant="outline" onClick={() => setIsManageSectionsOpen(true)}>Manage Sections</Button>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow"
          />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <DragOverlay>
          {/* Render active drag item here if needed */}
        </DragOverlay>

        <SortableContext items={sections.map(s => `section-${s.id}`)} strategy={verticalListSortingStrategy}>
          {sections.map(section => (
            <div key={section.id} className="mb-6">
              <SortableSectionHeader
                id={`section-${section.id}`}
                section={section}
                onUpdateSectionName={async (id, newName) => {
                  const updated = await updateSection({ id, updates: { name: newName } });
                  return updated;
                }}
                onDeleteSection={deleteSection}
                onToggleIncludeInFocusMode={updateSectionIncludeInFocusMode}
              />
              <SortableContext items={tasksBySection.get(section.id)?.map(task => task.id) || []} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 mt-2">
                  {tasksBySection.get(section.id)?.map(task => (
                    <SortableTaskItem
                      key={task.id}
                      id={task.id}
                      task={task}
                      onUpdateTask={onUpdateTask}
                      onDeleteTask={onDeleteTask}
                      onAddSubtask={onAddSubtask}
                      onToggleFocusMode={onToggleFocusMode}
                      onLogDoTodayOff={onLogDoTodayOff}
                      categories={categories}
                      sections={sections}
                      tasks={tasks}
                      doTodayOffLog={doTodayOffLog}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          ))}
        </SortableContext>

        {tasksBySection.get('no-section')?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">No Section</h3>
              <SortableContext items={tasksBySection.get('no-section')?.map(task => task.id) || []} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {tasksBySection.get('no-section')?.map(task => (
                    <SortableTaskItem
                      key={task.id}
                      id={task.id}
                      task={task}
                      onUpdateTask={onUpdateTask}
                      onDeleteTask={onDeleteTask}
                      onAddSubtask={onAddSubtask}
                      onToggleFocusMode={onToggleFocusMode}
                      onLogDoTodayOff={onLogDoTodayOff}
                      categories={categories}
                      sections={sections}
                      tasks={tasks}
                      doTodayOffLog={doTodayOffLog}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          )}
      </DndContext>

      <Sheet open={isAddTaskSheetOpen} onOpenChange={setIsAddTaskSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add New Task</SheetTitle>
          </SheetHeader>
          <AddTaskForm
            onAddTask={onAddTask}
            categories={categories}
            sections={sections}
            currentDate={new Date()}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            showCompleted={showCompleted}
            onClose={() => setIsAddTaskSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

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
    </div>
  );
};

export default TaskList;