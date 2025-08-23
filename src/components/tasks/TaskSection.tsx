import React from 'react';
import { DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';
import { Task, TaskCategory, TaskSection, UpdateTaskData, DoTodayOffLogEntry } from '@/types';
import TaskCard from './TaskCard';

interface TaskSectionProps {
  section: TaskSection;
  tasks: Task[];
  categories: TaskCategory[];
  sections: TaskSection[];
  onTaskUpdate: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onTaskDelete: (id: string) => Promise<void>;
  onAddTask: (description: string, sectionId: string | null, parentTaskId: string | null, dueDate: Date | null, categoryId: string | null, priority: string) => Promise<Task>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  doTodayOffLog: DoTodayOffLogEntry[] | undefined;
}

const TaskSectionComponent: React.FC<TaskSectionProps> = ({
  section,
  tasks,
  categories,
  sections: allSections,
  onTaskUpdate,
  onTaskDelete,
  onAddTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
  doTodayOffLog,
}) => {
  const sectionTasks = tasks.filter(task => task.section_id === section.id && !task.parent_task_id);

  return (
    <div className="space-y-2">
      {sectionTasks.map((task, index) => (
        <TaskCard
          key={task.id}
          task={task}
          categories={categories}
          sections={allSections}
          onUpdateTask={onTaskUpdate}
          onDeleteTask={onTaskDelete}
          onAddSubtask={onAddSubtask}
          onToggleFocusMode={onToggleFocusMode}
          onLogDoTodayOff={onLogDoTodayOff}
          tasks={tasks} // Pass all tasks for subtasks
          doTodayOffLog={doTodayOffLog}
        />
      ))}
    </div>
  );
};

export default TaskSectionComponent;