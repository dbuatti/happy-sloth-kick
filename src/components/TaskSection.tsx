import React from 'react';
import { Task, TaskCategory, TaskSection as TaskSectionType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
// import { cn } from '@/lib/utils'; // Removed unused import
import TaskItem from './TaskItem';

interface TaskSectionProps {
  section: TaskSectionType;
  tasks: Task[];
  categories: TaskCategory[];
  onAddTask: (description: string, sectionId: string) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string) => Promise<void>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  focusedTaskId: string | null;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetSectionId: string | null, targetParentTaskId: string | null) => void;
}

const TaskSection: React.FC<TaskSectionProps> = ({
  section,
  tasks,
  categories,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
  focusedTaskId,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const [showNewTaskInput, setShowNewTaskInput] = React.useState(false);
  const [newTaskDescription, setNewTaskDescription] = React.useState('');

  const handleAddTask = async () => {
    if (newTaskDescription.trim()) {
      await onAddTask(newTaskDescription, section.id);
      setNewTaskDescription('');
      setShowNewTaskInput(false);
    }
  };

  const renderTasks = (parentTaskId: string | null = null) => {
    return tasks
      .filter(task => task.section_id === section.id && task.parent_task_id === parentTaskId)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(task => (
        <div
          key={task.id}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, section.id, task.id)} // Drop onto a task to make it a subtask
          className="relative"
        >
          <TaskItem
            task={task}
            categories={categories}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onAddSubtask={onAddSubtask}
            onToggleFocusMode={onToggleFocusMode}
            onLogDoTodayOff={onLogDoTodayOff}
            isFocusedTask={focusedTaskId === task.id}
            subtasks={tasks.filter(sub => sub.parent_task_id === task.id)}
            renderSubtasks={renderTasks}
            isDragging={isDragging}
            onDragStart={onDragStart}
          />
        </div>
      ));
  };

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200 min-h-[200px]"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, section.id, null)} // Drop onto section to make it a top-level task
    >
      <h2 className="text-lg font-semibold text-gray-800">{section.name}</h2>

      <div className="space-y-2">
        {renderTasks()}
      </div>

      {showNewTaskInput ? (
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="New task description"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTask();
              if (e.key === 'Escape') setShowNewTaskInput(false);
            }}
            autoFocus
          />
          <Button onClick={handleAddTask}>Add</Button>
          <Button variant="outline" onClick={() => setShowNewTaskInput(false)}>Cancel</Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full justify-start text-gray-500 hover:text-gray-900"
          onClick={() => setShowNewTaskInput(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      )}
    </div>
  );
};

export default TaskSection;