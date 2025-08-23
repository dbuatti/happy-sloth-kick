import React, { useState } from 'react';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { GripVertical, Check, X, Edit, Trash2, Plus, CalendarDays, Repeat, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import PriorityBadge from './PriorityBadge';
import CategoryBadge from './CategoryBadge';
import TaskForm from './TaskForm';
import { Task, TaskCategory, TaskSection } from '@/types/task-management';
import { Draggable } from '@hello-pangea/dnd';

interface TaskItemProps {
  task: Task;
  index: number;
  categories: TaskCategory[];
  sections: TaskSection[];
  onUpdateTask: (task: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (newTask: Partial<Task>) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  index,
  categories,
  sections,
  onUpdateTask,
  onDeleteTask,
  onAddTask,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const category = categories.find((cat) => cat.id === task.category);

  const handleToggleComplete = () => {
    onUpdateTask({ ...task, status: task.status === 'completed' ? 'to-do' : 'completed' });
  };

  const handleSaveTask = (updatedTask: Partial<Task>) => {
    onUpdateTask(updatedTask);
    setIsEditing(false);
  };

  const handleAddSubtask = (newTask: Partial<Task>) => {
    onAddTask({ ...newTask, parent_task_id: task.id, section_id: task.section_id });
  };

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'completed';
  const isDueToday = task.due_date && isToday(parseISO(task.due_date)) && task.status !== 'completed';

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            'bg-white p-3 rounded-md shadow-sm border border-gray-200 mb-2',
            task.status === 'completed' && 'opacity-60 line-through',
            isOverdue && 'border-red-400 bg-red-50',
            isDueToday && 'border-orange-400 bg-orange-50'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-grow">
              <span {...provided.dragHandleProps} className="mr-2 text-gray-400 cursor-grab">
                <GripVertical className="h-4 w-4" />
              </span>
              <Checkbox checked={task.status === 'completed'} onCheckedChange={handleToggleComplete} className="mr-3" />
              <div className="flex-grow">
                <p className="text-sm font-medium text-gray-800">{task.description}</p>
                <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                  {task.due_date && (
                    <span className="flex items-center">
                      <CalendarDays className="h-3 w-3 mr-1" /> {format(parseISO(task.due_date), 'MMM d')}
                    </span>
                  )}
                  {task.priority && <PriorityBadge priority={task.priority} />}
                  {category && <CategoryBadge category={category} />}
                  {task.recurring_type !== 'none' && (
                    <span className="flex items-center">
                      <Repeat className="h-3 w-3 mr-1" /> {task.recurring_type}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{task.description}</DialogTitle>
                  </DialogHeader>
                  <TaskForm
                    initialTask={task}
                    onSave={handleSaveTask}
                    onClose={() => setIsEditing(false)}
                    categories={categories}
                    sections={sections}
                  />
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => onDeleteTask(task.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Subtask to "{task.description}"</DialogTitle>
                  </DialogHeader>
                  <TaskForm
                    parentTaskId={task.id}
                    sectionId={task.section_id}
                    onSave={handleAddSubtask}
                    onClose={() => {}}
                    categories={categories}
                    sections={sections}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="ml-8 mt-2 border-l pl-4">
              {task.subtasks.map((subtask, subIndex) => (
                <TaskItem
                  key={subtask.id}
                  task={subtask}
                  index={subIndex}
                  categories={categories}
                  sections={sections}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onAddTask={onAddTask}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default TaskItem;