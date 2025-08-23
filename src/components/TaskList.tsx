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
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Task, TaskCategory, TaskSection } from '@/types';
import { SortableTaskItem } from './SortableTaskItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import AddTaskForm from './AddTaskForm';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'react-hot-toast';

interface TaskListProps {
  tasks: Task[];
  categories: TaskCategory[];
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddTask: (description: string, sectionId: string | null, parentTaskId: string | null, dueDate: Date | null, categoryId: string | null, priority: string) => Promise<Task>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  sections: TaskSection[];
  allCategories: TaskCategory[];
  currentDate: Date;
  createSection: (data: { name: string; include_in_focus_mode?: boolean }) => Promise<TaskSection>;
  updateSection: (data: { id: string; updates: Partial<TaskSection> }) => Promise<TaskSection>;
  deleteSection: (id: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  showCompleted?: boolean;
  showFilters?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  categories,
  onUpdateTask,
  onDeleteTask,
  onAddTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
  sections,
  allCategories,
  currentDate,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  showCompleted = false,
  showFilters = true,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('to-do');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDueDate, setFilterDueDate] = useState<Date | undefined>(undefined);
  const [isAddTaskSheetOpen, setIsAddTaskSheetOpen] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTask = activeId ? tasks.find(task => task.id === activeId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!active || !over || active.id === over.id) return;

    const draggedTask = tasks.find(t => t.id === active.id);
    if (!draggedTask) return;

    const targetTask = tasks.find(t => t.id === over.id);
    const targetSection = sections.find(s => s.id === over.id);

    let newParentTaskId: string | null = null;
    let newSectionId: string | null = draggedTask.section_id;
    let newOrder: number = draggedTask.order || 0;

    if (targetTask) {
      // Dropped onto another task (potentially as a subtask)
      const rect = event.activatorEvent.target.getBoundingClientRect();
      const isDroppedOnBottomHalf = event.activatorEvent.clientY > rect.bottom - rect.height / 2;

      if (isDroppedOnBottomHalf) {
        // Drop as a subtask
        newParentTaskId = targetTask.id;
        newSectionId = targetTask.section_id; // Subtasks inherit section from parent
        const subtasksOfTarget = tasks.filter(t => t.parent_task_id === targetTask.id);
        newOrder = subtasksOfTarget.length > 0 ? Math.max(...subtasksOfTarget.map(t => t.order || 0)) + 1 : 0;
        toast.success(`'${draggedTask.description}' is now a subtask of '${targetTask.description}'`);
      } else {
        // Drop as a sibling
        newParentTaskId = targetTask.parent_task_id;
        newSectionId = targetTask.section_id;
        const siblings = tasks.filter(t => t.parent_task_id === newParentTaskId && t.section_id === newSectionId);
        const oldIndex = siblings.findIndex(t => t.id === draggedTask.id);
        const newIndex = siblings.findIndex(t => t.id === targetTask.id);
        const reorderedSiblings = arrayMove(siblings, oldIndex, newIndex);
        await Promise.all(reorderedSiblings.map((t, i) => onUpdateTask(t.id, { order: i })));
        toast.success(`'${draggedTask.description}' reordered.`);
        return; // Exit early as order is handled
      }
    } else if (targetSection) {
      // Dropped onto a section header
      newParentTaskId = null;
      newSectionId = targetSection.id;
      const topLevelTasksInSection = tasks.filter(t => t.section_id === newSectionId && t.parent_task_id === null);
      newOrder = topLevelTasksInSection.length > 0 ? Math.max(...topLevelTasksInSection.map(t => t.order || 0)) + 1 : 0;
      toast.success(`'${draggedTask.description}' moved to section '${targetSection.name}'`);
    } else {
      // Dropped into general area (no specific task or section)
      newParentTaskId = null;
      newSectionId = draggedTask.section_id; // Keep original section if dropped into general area
      const topLevelTasks = tasks.filter(t => t.section_id === newSectionId && t.parent_task_id === null);
      newOrder = topLevelTasks.length > 0 ? Math.max(...topLevelTasks.map(t => t.order || 0)) + 1 : 0;
      toast.success(`'${draggedTask.description}' reordered.`);
    }

    if (draggedTask.parent_task_id !== newParentTaskId || draggedTask.section_id !== newSectionId || draggedTask.order !== newOrder) {
      await onUpdateTask(draggedTask.id, {
        parent_task_id: newParentTaskId,
        section_id: newSectionId,
        order: newOrder,
      });
    }
  };

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (!showCompleted) {
      filtered = filtered.filter(task => task.status !== 'completed');
    } else {
      // If showCompleted is true, filter by status if 'all' is not selected
      if (filterStatus !== 'all') {
        filtered = filtered.filter(task => task.status === filterStatus);
      }
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

    return filtered;
  }, [tasks, showCompleted, filterStatus, filterCategory, filterPriority, searchQuery, filterDueDate]);

  const tasksBySection = useMemo(() => {
    const map = new Map<string, Task[]>();
    sections.forEach(section => map.set(section.id, []));
    map.set('no-section', []); // For tasks without a section

    filteredTasks.forEach(task => {
      if (task.parent_task_id === null) { // Only consider top-level tasks for sections
        const sectionId = task.section_id || 'no-section';
        map.get(sectionId)?.push(task);
      }
    });

    // Sort tasks within each section
    map.forEach((taskList, sectionId) => {
      map.set(sectionId, taskList.sort((a, b) => {
        if (a.order !== null && b.order !== null) {
          return a.order - b.order;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }));
    });

    return map;
  }, [filteredTasks, sections]);

  const renderSubtasks = useCallback((parentTaskId: string) => {
    const subtasks = tasks.filter(sub => sub.parent_task_id === parentTaskId);
    return (
      <div className="ml-4 border-l pl-4 space-y-2">
        {subtasks.map(subtask => (
          <SortableTaskItem
            key={subtask.id}
            task={subtask}
            categories={categories}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onAddSubtask={onAddSubtask}
            onToggleFocusMode={onToggleFocusMode}
            onLogDoTodayOff={onLogDoTodayOff}
            isFocusedTask={false}
            subtasks={[]} // Subtasks don't have further nested subtasks in this view
            renderSubtasks={() => null}
          />
        ))}
      </div>
    );
  }, [tasks, categories, onUpdateTask, onDeleteTask, onAddSubtask, onToggleFocusMode, onLogDoTodayOff]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {showFilters && (
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search tasks..."
                className="pl-10 pr-4 py-2 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4 text-gray-500" />
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="to-do">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4 text-gray-500" />
                <SelectValue placeholder="Filter by Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {allCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4 text-gray-500" />
                <SelectValue placeholder="Filter by Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[180px] justify-start text-left font-normal",
                    !filterDueDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {filterDueDate ? format(filterDueDate, "PPP") : <span>Filter by Due Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filterDueDate}
                  onSelect={setFilterDueDate}
                  initialFocus
                />
                {filterDueDate && (
                  <div className="p-2">
                    <Button variant="ghost" onClick={() => setFilterDueDate(undefined)} className="w-full">Clear Date</Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        )}

        {sections.map(section => (
          <div key={section.id} className="mb-6">
            <h2 className="text-xl font-semibold mb-2 p-2 bg-gray-100 rounded-md">{section.name}</h2>
            <div className="space-y-2">
              <SortableContext items={tasksBySection.get(section.id)?.map(task => task.id) || []} strategy={verticalListSortingStrategy}>
                {tasksBySection.get(section.id)?.map(task => (
                  <SortableTaskItem
                    key={task.id}
                    task={task}
                    categories={categories}
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                    onAddSubtask={onAddSubtask}
                    onToggleFocusMode={onToggleFocusMode}
                    onLogDoTodayOff={onLogDoTodayOff}
                    isFocusedTask={false}
                    subtasks={tasks.filter(sub => sub.parent_task_id === task.id)}
                    renderSubtasks={renderSubtasks}
                  />
                ))}
              </SortableContext>
            </div>
          </div>
        ))}

        {tasksBySection.get('no-section')?.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2 p-2 bg-gray-100 rounded-md">No Section</h2>
            <div className="space-y-2">
              <SortableContext items={tasksBySection.get('no-section')?.map(task => task.id) || []} strategy={verticalListSortingStrategy}>
                {tasksBySection.get('no-section')?.map(task => (
                  <SortableTaskItem
                    key={task.id}
                    task={task}
                    categories={categories}
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                    onAddSubtask={onAddSubtask}
                    onToggleFocusMode={onToggleFocusMode}
                    onLogDoTodayOff={onLogDoTodayOff}
                    isFocusedTask={false}
                    subtasks={tasks.filter(sub => sub.parent_task_id === task.id)}
                    renderSubtasks={renderSubtasks}
                  />
                ))}
              </SortableContext>
            </div>
          </div>
        )}

        {filteredTasks.length === 0 && (
          <p className="text-center text-gray-500 py-8">No tasks found matching your criteria.</p>
        )}
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskItem
            task={activeTask}
            categories={categories}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onAddSubtask={onAddSubtask}
            onToggleFocusMode={onToggleFocusMode}
            onLogDoTodayOff={onLogDoTodayOff}
            isFocusedTask={false}
            subtasks={[]}
            renderSubtasks={() => null}
          />
        ) : null}
      </DragOverlay>

      <Sheet open={isAddTaskSheetOpen} onOpenChange={setIsAddTaskSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Add New Task</SheetTitle>
          </SheetHeader>
          <AddTaskForm
            onAddTask={onAddTask}
            onTaskAdded={() => setIsAddTaskSheetOpen(false)}
            sections={sections}
            allCategories={allCategories}
            currentDate={currentDate}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          />
        </SheetContent>
      </Sheet>
    </DndContext>
  );
};

export default TaskList;