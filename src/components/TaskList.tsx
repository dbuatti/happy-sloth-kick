import React, { useState, useMemo } from 'react';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import TaskItem from '@/components/TaskItem';
import TaskForm from '@/components/TaskForm';

interface TaskListProps {
  tasks: Task[];
  sections: TaskSection[];
  allCategories: Category[];
  currentDate?: Date;
  onAddTask: (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<boolean>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  createSection: (sectionData: Omit<TaskSection, 'id' | 'user_id' | 'created_at'>) => Promise<TaskSection | null>;
  updateSection: (id: string, updates: Partial<TaskSection>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (id: string, includeInFocusMode: boolean) => Promise<void>;
  emptyStateMessage?: string;
  autoFocus?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  sections,
  allCategories,
  currentDate,
  onAddTask,
  updateTask,
  deleteTask,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  emptyStateMessage = "No tasks found",
  autoFocus = false,
}) => {
  const [isAddingTask, setIsAddingTask] = useState(autoFocus);

  const handleAddTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    const success = await onAddTask(taskData);
    if (success) {
      setIsAddingTask(false);
    }
    return success;
  };

  const handleCancelAdd = () => {
    setIsAddingTask(false);
  };

  const allSortableSections = useMemo(() => {
    const noSection: TaskSection = {
      id: 'no-section-header',
      name: 'No Section',
      user_id: '', // Will be set by the hook
      order: -1,
      created_at: new Date().toISOString(),
      include_in_focus_mode: true,
    };
    
    return [noSection, ...sections];
  }, [sections]);

  // Mark these as used to avoid TS errors
  void allSortableSections;

  return (
    <div className="space-y-2">
      {isAddingTask ? (
        <div className="p-4 rounded-lg border bg-card">
          <TaskForm
            onSubmit={async (data) => {
              await handleAddTask(data);
              return Promise.resolve(); // Return void promise to match expected type
            }}
            onCancel={handleCancelAdd}
            sections={sections}
            allCategories={allCategories}
            currentDate={currentDate}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          />
        </div>
      ) : (
        <Button 
          variant="outline" 
          className="w-full flex items-center gap-2"
          onClick={() => setIsAddingTask(true)}
        >
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      )}
      
      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              sections={sections}
              allCategories={allCategories}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onEdit={() => {
                // Handle edit if needed
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          {emptyStateMessage}
        </div>
      )}
    </div>
  );
};

export default TaskList;