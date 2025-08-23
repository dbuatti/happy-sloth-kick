import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Task, TaskCategory, TaskSection } from '@/types';
import SortableTaskItem from './SortableTaskItem';
import TaskItem from './TaskItem'; // For DragOverlay
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter, XCircle, Focus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface TaskListProps {
  tasks: Task[];
  sections: TaskSection[];
  categories: TaskCategory[];
  focusedTaskId: string | null;
  onAddTask: (description: string, sectionId: string | null, parentTaskId?: string | null) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onReorderTasks: (updates: { id: string; order: number; parent_task_id: string | null; section_id: string | null }[]) => Promise<void>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  sections,
  categories,
  focusedTaskId,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
  onToggleFocusMode,
  onLogDoTodayOff,
}) => {
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [showNewTaskInput, setShowNewTaskInput] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<Task['status'] | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Task['priority'] | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string | 'all'>('all');
  const [filterDueDate, setFilterDueDate] = useState<Date | undefined>(undefined);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeItemData = useMemo(() => tasks.find(task => task.id === activeId), [tasks, activeId]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(task => task.category === filterCategory);
    }

    if (filterDueDate) {
      filtered = filtered.filter(task => task.due_date && isSameDay(new Date(task.due_date), filterDueDate));
    }

    return filtered;
  }, [tasks, searchTerm, filterStatus, filterPriority, filterCategory, filterDueDate]);

  const getTasksForSection = (sectionId: string | null, parentTaskId: string | null = null) => {
    return filteredTasks
      .filter(task => task.section_id === sectionId && task.parent_task_id === parentTaskId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const handleAddTask = async (sectionId: string | null = null, parentTaskId: string | null = null) => {
    if (newTaskDescription.trim()) {
      await onAddTask(newTaskDescription, sectionId, parentTaskId);
      setNewTaskDescription('');
      setShowNewTaskInput(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over) {
      setActiveId(null);
      return;
    }

    const draggedTask = tasks.find(t => t.id === active.id);
    const targetTask = tasks.find(t => t.id === over.id);

    if (!draggedTask) {
      setActiveId(null);
      return;
    }

    let newParentTaskId: string | null = null;
    let newSectionId: string | null = draggedTask.section_id;
    let newOrder: number = draggedTask.order || 0;

    if (targetTask) {
      // Dropped onto another task, make it a subtask
      newParentTaskId = targetTask.id;
      newSectionId = targetTask.section_id; // Subtasks inherit section from parent
      const subtasksOfTarget = tasks.filter(t => t.parent_task_id === targetTask.id);
      newOrder = subtasksOfTarget.length > 0 ? Math.max(...subtasksOfTarget.map(t => t.order || 0)) + 1 : 0;
    } else {
      // Dropped into a section (or root if no section)
      const overSection = sections.find(s => s.id === over.id);
      if (overSection) {
        newSectionId = overSection.id;
        newParentTaskId = null;
        const tasksInSection = tasks.filter(t => t.section_id === overSection.id && t.parent_task_id === null);
        newOrder = tasksInSection.length > 0 ? Math.max(...tasksInSection.map(t => t.order || 0)) + 1 : 0;
      } else {
        // Dropped outside any specific section/task, keep current section or null
        newParentTaskId = null;
        newSectionId = draggedTask.section_id; // Keep original section if dropped into general area
        const topLevelTasks = tasks.filter(t => t.section_id === newSectionId && t.parent_task_id === null);
        newOrder = topLevelTasks.length > 0 ? Math.max(...topLevelTasks.map(t => t.order || 0)) + 1 : 0;
      }
    }

    const updates = [{
      id: draggedTask.id,
      order: newOrder,
      parent_task_id: newParentTaskId,
      section_id: newSectionId,
    }];

    await onReorderTasks(updates);
    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const renderTasksRecursively = (sectionId: string | null, parentTaskId: string | null = null) => {
    const currentLevelTasks = getTasksForSection(sectionId, parentTaskId);

    return (
      <SortableContext items={currentLevelTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
        {currentLevelTasks.map(task => (
          <SortableTaskItem
            key={task.id}
            task={task}
            allTasks={tasks} // Pass all tasks for subtask filtering
            categories={categories}
            onStatusChange={async (taskId: string, newStatus: Task['status']) => { await onUpdateTask(taskId, { status: newStatus }); return taskId; }}
            onDelete={onDeleteTask}
            onUpdate={async (taskId: string, updates: Partial<Task>) => { await onUpdateTask(taskId, updates); return taskId; }}
            onAddSubtask={(description, subParentTaskId) => onAddTask(description, sectionId, subParentTaskId)}
            onToggleFocusMode={onToggleFocusMode}
            onLogDoTodayOff={onLogDoTodayOff}
            isFocusedTask={focusedTaskId === task.id}
            isDragging={activeId === task.id}
            onDragStart={(e, t) => { e.stopPropagation(); setActiveId(t.id); }}
          />
        ))}
      </SortableContext>
    );
  };

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search tasks..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4">
              <h4 className="font-semibold mb-2">Filter by:</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filterStatus} onValueChange={(value: Task['status'] | 'all') => setFilterStatus(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="to-do">To-Do</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={filterPriority} onValueChange={(value: Task['priority'] | 'all') => setFilterPriority(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Priorities" />
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
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={filterCategory} onValueChange={(value: string | 'all') => setFilterCategory(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Due Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filterDueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterDueDate ? format(filterDueDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filterDueDate}
                        onSelect={setFilterDueDate}
                        initialFocus
                      />
                      {filterDueDate && (
                        <div className="p-2">
                          <Button variant="outline" className="w-full" onClick={() => setFilterDueDate(undefined)}>
                            Clear Date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="space-y-4">
          {sections.map(section => (
            <div key={section.id} className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">{section.name}</h3>
              <div className="space-y-2">
                {renderTasksRecursively(section.id)}
              </div>
              {showNewTaskInput && (
                <div className="flex gap-2 mt-4">
                  <Input
                    placeholder="New task description"
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTask(section.id);
                      if (e.key === 'Escape') setShowNewTaskInput(false);
                    }}
                    autoFocus
                  />
                  <Button onClick={() => handleAddTask(section.id)}>Add</Button>
                  <Button variant="outline" onClick={() => setShowNewTaskInput(false)}>Cancel</Button>
                </div>
              )}
              {!showNewTaskInput && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-gray-500 hover:text-gray-900 mt-4"
                  onClick={() => setShowNewTaskInput(true)}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Task to {section.name}
                </Button>
              )}
            </div>
          ))}

          {/* Uncategorized/Unsectioned Tasks */}
          <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Other Tasks</h3>
            <div className="space-y-2">
              {renderTasksRecursively(null)} {/* Tasks with no section */}
            </div>
            {showNewTaskInput && (
              <div className="flex gap-2 mt-4">
                <Input
                  placeholder="New task description"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTask(null);
                    if (e.key === 'Escape') setShowNewTaskInput(false);
                  }}
                  autoFocus
                />
                <Button onClick={() => handleAddTask(null)}>Add</Button>
                <Button variant="outline" onClick={() => setShowNewTaskInput(false)}>Cancel</Button>
              </div>
            )}
            {!showNewTaskInput && (
              <Button
                variant="outline"
                className="w-full justify-start text-gray-500 hover:text-gray-900 mt-4"
                onClick={() => setShowNewTaskInput(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Other Task
              </Button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeId && activeItemData ? (
            <TaskItem
              task={activeItemData as Task}
              categories={categories}
              onUpdateTask={async (taskId: string, updates: Partial<Task>) => { await onUpdateTask(taskId, updates); return taskId; }}
              onDeleteTask={onDeleteTask}
              onAddSubtask={async (description: string, parentTaskId: string) => { await onAddTask(description, null, parentTaskId); }}
              onToggleFocusMode={onToggleFocusMode}
              onLogDoTodayOff={onLogDoTodayOff}
              isFocusedTask={focusedTaskId === activeId}
              subtasks={tasks.filter(t => t.parent_task_id === activeId)}
              renderSubtasks={(parentTaskId) => (
                tasks
                  .filter(t => t.parent_task_id === parentTaskId)
                  .map(subtask => (
                    <TaskItem
                      key={subtask.id}
                      task={subtask as Task}
                      categories={categories}
                      onUpdateTask={async (taskId: string, updates: Partial<Task>) => { await onUpdateTask(taskId, updates); }}
                      onDeleteTask={async (taskId: string) => { await onDeleteTask(taskId); }}
                      onAddSubtask={async (description: string, parentTaskId: string) => { await onAddTask(description, null, parentTaskId); }}
                      onToggleFocusMode={() => {}}
                      onLogDoTodayOff={() => {}}
                      isFocusedTask={false}
                      subtasks={[]}
                      renderSubtasks={() => null}
                      isDragging={false}
                      onDragStart={() => {}}
                    />
                  ))
              )}
              isDragging={true}
              onDragStart={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default TaskList;