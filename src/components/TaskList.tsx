import React, { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { showSuccess, showError } from "@/utils/toast";
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type TaskSection = 'morning-baseline' | 'priorities' | 'dailies';

interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  is_daily_recurring: boolean;
  section: TaskSection; // New property for task section
}

// In-memory store for mock task states per day
// Key: YYYY-MM-DD, Value: Array of tasks for that day
const mockDailyTaskStates = new Map<string, Task[]>();

// Initial set of tasks that define the base for each day
const initialBaseTasks: Task[] = [
  { id: '1', description: 'Wake up & Hydrate', status: 'to-do', is_daily_recurring: true, section: 'morning-baseline' },
  { id: '2', description: 'Meditate for 10 mins', status: 'to-do', is_daily_recurring: true, section: 'morning-baseline' },
  { id: '3', description: 'Review project proposal', status: 'to-do', is_daily_recurring: false, section: 'priorities' },
  { id: '4', description: 'Prepare presentation slides', status: 'to-do', is_daily_recurring: false, section: 'priorities' },
  { id: '5', description: 'Check emails', status: 'to-do', is_daily_recurring: true, section: 'dailies' },
  { id: '6', description: 'Plan tomorrow\'s tasks', status: 'to-do', is_daily_recurring: true, section: 'dailies' },
];

const getFormattedDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

// Mock function to fetch tasks for a specific date
const mockFetchTasks = async (date: Date): Promise<Task[]> => {
  const dateKey = getFormattedDateKey(date);

  if (!mockDailyTaskStates.has(dateKey)) {
    // If no state for this date, initialize it
    const newDayTasks = initialBaseTasks.map(task => {
      if (task.is_daily_recurring) {
        // Daily recurring tasks reset to 'to-do' for a new day
        return { ...task, status: 'to-do' } as Task;
      }
      // Non-daily recurring tasks retain their initial status (or could be 'archived' if completed on a previous day in a real system)
      return task;
    });
    mockDailyTaskStates.set(dateKey, newDayTasks);
  }
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockDailyTaskStates.get(dateKey)!);
    }, 500);
  });
};

// Mock function to update task status for a specific date
const mockUpdateTaskStatus = async (date: Date, taskId: string, newStatus: Task['status']): Promise<Task> => {
  const dateKey = getFormattedDateKey(date);
  const tasksForDay = mockDailyTaskStates.get(dateKey);

  if (!tasksForDay) {
    throw new Error("Tasks for this day not found in mock store.");
  }

  const updatedTasks = tasksForDay.map(task =>
    task.id === taskId ? { ...task, status: newStatus } : task
  );
  mockDailyTaskStates.set(dateKey, updatedTasks);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.1) { // Simulate occasional failure
        showSuccess(`Task status updated to ${newStatus}`);
        const updatedTask = updatedTasks.find(t => t.id === taskId);
        if (updatedTask) {
          resolve(updatedTask);
        } else {
          reject(new Error("Task not found after update."));
        }
      } else {
        showError("Failed to update task status.");
        reject(new Error("Failed to update task status"));
      }
    }, 300);
  });
};

// Mock function to add a task for a specific date
const mockAddTask = async (description: string, isDailyRecurring: boolean, date: Date, section: TaskSection): Promise<Task> => {
  const dateKey = getFormattedDateKey(date);
  const newTask: Task = { id: String(Date.now()), description, status: 'to-do', is_daily_recurring: isDailyRecurring, section };

  // Add to the current day's tasks
  const tasksForDay = mockDailyTaskStates.get(dateKey) || [];
  mockDailyTaskStates.set(dateKey, [...tasksForDay, newTask]);

  // If it's a daily recurring task, add it to the base set for future days
  if (isDailyRecurring) {
    initialBaseTasks.push(newTask);
  }

  return new Promise(resolve => {
    setTimeout(() => {
      showSuccess("Task added successfully!");
      resolve(newTask);
    }, 300);
  });
};

// Mock function to delete a task for a specific date
const mockDeleteTask = async (date: Date, taskId: string): Promise<void> => {
  const dateKey = getFormattedDateKey(date);
  const tasksForDay = mockDailyTaskStates.get(dateKey);

  if (!tasksForDay) {
    throw new Error("Tasks for this day not found in mock store.");
  }

  const updatedTasks = tasksForDay.filter(task => task.id !== taskId);
  mockDailyTaskStates.set(dateKey, updatedTasks);

  // Also remove from initialBaseTasks if it was a daily recurring task
  const taskToDelete = tasksForDay.find(task => task.id === taskId);
  if (taskToDelete?.is_daily_recurring) {
    const index = initialBaseTasks.findIndex(task => task.id === taskId);
    if (index > -1) {
      initialBaseTasks.splice(index, 1);
    }
  }

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.1) { // Simulate occasional failure
        showSuccess("Task deleted successfully!");
        resolve();
      } else {
        showError("Failed to delete task.");
        reject(new Error("Failed to delete task"));
      }
    }, 300);
  });
};

// Mock function to update task section and order
const mockUpdateTaskSectionAndOrder = async (date: Date, updatedTasks: Task[]): Promise<Task[]> => {
  const dateKey = getFormattedDateKey(date);
  mockDailyTaskStates.set(dateKey, updatedTasks);
  return new Promise(resolve => {
    setTimeout(() => {
      showSuccess("Tasks reordered/moved successfully!");
      resolve(updatedTasks);
    }, 100);
  });
};

interface SortableTaskItemProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
  onDeleteTask: (taskId: string) => void;
  onSelectTask: (taskId: string, isSelected: boolean) => void;
  isSelected: boolean;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({ task, onStatusChange, onDeleteTask, onSelectTask, isSelected }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center justify-between p-3 border rounded-md bg-gray-50 dark:bg-gray-800 cursor-grab"
    >
      <div className="flex items-center space-x-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectTask(task.id, checked as boolean)}
          id={`select-task-${task.id}`}
        />
        <Checkbox
          checked={task.status === 'completed'}
          onCheckedChange={() => onStatusChange(task.id, task.status === 'completed' ? 'to-do' : 'completed')}
          id={`complete-task-${task.id}`}
        />
        <Label
          htmlFor={`complete-task-${task.id}`}
          className={`text-lg ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}
        >
          {task.description}
        </Label>
        {task.is_daily_recurring && (
          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-200">
            Daily
          </span>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
          {task.status}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onStatusChange(task.id, 'to-do')}>
              Mark as To-Do
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(task.id, 'completed')}>
              Mark as Completed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(task.id, 'skipped')}>
              Mark as Skipped
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(task.id, 'archived')}>
              Mark as Archived
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDeleteTask(task.id)} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
};

interface TaskSectionProps {
  id: TaskSection;
  title: string;
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
  onDeleteTask: (taskId: string) => void;
  onSelectTask: (taskId: string, isSelected: boolean) => void;
  selectedTaskIds: Set<string>;
}

const TaskSection: React.FC<TaskSectionProps> = ({ id, title, tasks, onStatusChange, onDeleteTask, onSelectTask, selectedTaskIds }) => {
  const { setNodeRef } = useSortable({ id });
  const taskIds = tasks.map(task => task.id);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4 text-center">{title}</h3>
      <SortableContext id={id} items={taskIds}>
        <ul ref={setNodeRef} className="space-y-3 min-h-[100px] p-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
          {tasks.length === 0 ? (
            <p className="text-center text-gray-500 text-sm">Drag tasks here or add new ones!</p>
          ) : (
            tasks.map(task => (
              <SortableTaskItem
                key={task.id}
                task={task}
                onStatusChange={onStatusChange}
                onDeleteTask={onDeleteTask}
                onSelectTask={onSelectTask}
                isSelected={selectedTaskIds.has(task.id)}
              />
            ))
          )}
        </ul>
      </SortableContext>
    </div>
  );
};


const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskDescription, setNewTaskDescription] = useState<string>('');
  const [isNewTaskDailyRecurring, setIsNewTaskDailyRecurring] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [newTaskSection, setNewTaskSection] = useState<TaskSection>('priorities'); // Default section for new tasks

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedTasks = await mockFetchTasks(currentDate);
      setTasks(fetchedTasks);
      setSelectedTaskIds(new Set()); // Clear selection on date change
    } catch (error) {
      showError("Failed to load tasks.");
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await mockUpdateTaskStatus(currentDate, taskId, newStatus);
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await mockDeleteTask(currentDate, taskId);
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      setSelectedTaskIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskDescription.trim()) {
      showError("Task description cannot be empty.");
      return;
    }
    try {
      const addedTask = await mockAddTask(newTaskDescription, isNewTaskDailyRecurring, currentDate, newTaskSection);
      setTasks(prevTasks => [...prevTasks, addedTask]);
      setNewTaskDescription('');
      setIsNewTaskDailyRecurring(false);
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && newTaskDescription.trim()) {
      handleAddTask();
    }
  };

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => subDays(prevDate, 1));
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => addDays(prevDate, 1));
  };

  const handleSelectTask = (taskId: string, isSelected: boolean) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  };

  const handleSelectAllTasks = (checked: boolean) => {
    if (checked) {
      const allTaskIds = new Set(tasks.map(task => task.id));
      setSelectedTaskIds(allTaskIds);
    } else {
      setSelectedTaskIds(new Set());
    }
  };

  const handleDeleteSelectedTasks = async () => {
    if (selectedTaskIds.size === 0) {
      showError("No tasks selected for deletion.");
      return;
    }
    try {
      const idsToDelete = Array.from(selectedTaskIds);
      for (const taskId of idsToDelete) {
        await mockDeleteTask(currentDate, taskId);
      }
      showSuccess("Selected tasks deleted successfully!");
      setSelectedTaskIds(new Set());
      fetchTasks();
    } catch (error) {
      showError("Failed to delete selected tasks.");
      console.error("Error deleting selected tasks:", error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeContainer = active.data.current?.sortable.containerId as TaskSection;
    const overContainer = over.data.current?.sortable.containerId as TaskSection;

    if (activeId === overId) return;

    let updatedTasks = [...tasks];

    // Find the task being dragged
    const draggedTaskIndex = updatedTasks.findIndex(task => task.id === activeId);
    if (draggedTaskIndex === -1) return;

    const draggedTask = updatedTasks[draggedTaskIndex];

    if (activeContainer === overContainer) {
      // Reordering within the same container
      const tasksInContainer = updatedTasks.filter(task => task.section === activeContainer);
      const oldIndex = tasksInContainer.findIndex(task => task.id === activeId);
      const newIndex = tasksInContainer.findIndex(task => task.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(tasksInContainer, oldIndex, newIndex);
        // Update the main tasks array with the new order for this section
        updatedTasks = updatedTasks.filter(task => task.section !== activeContainer).concat(newOrder);
      }
    } else {
      // Moving between containers
      const newSection = overContainer;
      const updatedDraggedTask = { ...draggedTask, section: newSection };

      // Remove from old section and add to new section
      updatedTasks = updatedTasks.filter(task => task.id !== activeId);

      // Find the index to insert into the new container
      const overTaskIndex = updatedTasks.findIndex(task => task.id === overId);
      if (overTaskIndex !== -1) {
        updatedTasks.splice(overTaskIndex, 0, updatedDraggedTask);
      } else {
        // If overId is a container itself (empty container), add to the end of that container
        updatedTasks.push(updatedDraggedTask);
      }
    }

    setTasks(updatedTasks);
    await mockUpdateTaskSectionAndOrder(currentDate, updatedTasks);
  };

  const allTasksSelected = tasks.length > 0 && selectedTaskIds.size === tasks.length;
  const someTasksSelected = selectedTaskIds.size > 0 && selectedTaskIds.size < tasks.length;

  const morningBaselineTasks = tasks.filter(task => task.section === 'morning-baseline');
  const prioritiesTasks = tasks.filter(task => task.section === 'priorities');
  const dailiesTasks = tasks.filter(task => task.section === 'dailies');

  if (loading) {
    return <div className="text-center p-8">Loading tasks...</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center">Daily Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="icon" onClick={handlePreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-xl font-semibold">
            {isSameDay(currentDate, new Date()) ? 'Today' : format(currentDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          <Button variant="outline" size="icon" onClick={handleNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-6 space-y-4">
          <h2 className="text-2xl font-semibold mb-4">Add New Task</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Input
              placeholder="Task description"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-grow"
            />
            <div className="flex items-center space-x-2">
              <Switch
                id="daily-recurring"
                checked={isNewTaskDailyRecurring}
                onCheckedChange={setIsNewTaskDailyRecurring}
              />
              <Label htmlFor="daily-recurring">Daily Recurring</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="task-section">Section:</Label>
              <select
                id="task-section"
                value={newTaskSection}
                onChange={(e) => setNewTaskSection(e.target.value as TaskSection)}
                className="p-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="morning-baseline">Morning Baseline</option>
                <option value="priorities">Priorities</option>
                <option value="dailies">Dailies</option>
              </select>
            </div>
            <Button onClick={handleAddTask} className="w-full sm:w-auto">Add Task</Button>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-4">Your Tasks</h2>
        {tasks.length > 0 && (
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              checked={allTasksSelected}
              onCheckedChange={handleSelectAllTasks}
              id="select-all-tasks"
              className={someTasksSelected ? "border-gray-400 bg-gray-200" : ""}
            />
            <Label htmlFor="select-all-tasks">Select All</Label>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelectedTasks}
              disabled={selectedTaskIds.size === 0}
              className="ml-4"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedTaskIds.size})
            </Button>
          </div>
        )}

        {tasks.length === 0 ? (
          <p className="text-center text-gray-500">No tasks found. Add one above!</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TaskSection
                id="morning-baseline"
                title="Morning Baseline"
                tasks={morningBaselineTasks}
                onStatusChange={handleStatusChange}
                onDeleteTask={handleDeleteTask}
                onSelectTask={handleSelectTask}
                selectedTaskIds={selectedTaskIds}
              />
              <TaskSection
                id="priorities"
                title="Priorities"
                tasks={prioritiesTasks}
                onStatusChange={handleStatusChange}
                onDeleteTask={handleDeleteTask}
                onSelectTask={handleSelectTask}
                selectedTaskIds={selectedTaskIds}
              />
              <TaskSection
                id="dailies"
                title="Dailies"
                tasks={dailiesTasks}
                onStatusChange={handleStatusChange}
                onDeleteTask={handleDeleteTask}
                onSelectTask={handleSelectTask}
                selectedTaskIds={selectedTaskIds}
              />
            </div>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskList;