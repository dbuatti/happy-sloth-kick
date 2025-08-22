import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Play,
  Edit,
  Plus,
  Link,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskStatus, TaskPriority, TaskSection, TaskCategory } from '@/types/task';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { getCategoryColorProps } from '@/utils/categoryColors';
import TaskItem from './TaskItem';
import { FullScreenFocusViewProps } from '@/types/props';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

const FullScreenFocusView: React.FC<FullScreenFocusViewProps> = ({
  task,
  onClose,
  onComplete,
  onSkip,
  onOpenDetail,
  onUpdate,
  sections,
  allCategories,
  allTasks,
  onAddTask,
  onReorderTasks,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  createCategory,
  updateCategory,
  deleteCategory,
  onDelete,
  onStatusChange,
}) => {
  const [newSubtaskDescription, setNewSubtaskDescription] = useState('');

  useEffect(() => {
    if (!task) {
      onClose();
    }
  }, [task, onClose]);

  const handleSubtaskStatusChange = async (subtaskId: string, newStatus: TaskStatus): Promise<Task | null> => {
    const updatedTask = await onUpdate(subtaskId, { status: newStatus });
    return updatedTask;
  };

  const handleDeleteTask = async (taskId: string) => {
    await onDelete(taskId);
    onClose();
  };

  const handleAddSubtask = async () => {
    if (!task || !newSubtaskDescription.trim()) return;
    await onAddTask({
      description: newSubtaskDescription.trim(),
      parent_task_id: task.id,
      section_id: task.section_id,
      category: task.category,
      priority: task.priority,
      due_date: task.due_date,
    });
    setNewSubtaskDescription('');
  };

  const getDueDateText = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date) && !isToday(date)) return 'Overdue';
    return format(date, 'MMM d');
  };

  const getPriorityClasses = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 border-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 border-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 border-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 border-green-600 bg-green-50';
      default:
        return 'text-gray-500 border-gray-500 bg-gray-50';
    }
  };

  if (!task) return null;

  const category = allCategories.find((cat: TaskCategory) => cat.id === task.category);
  const section = sections.find((sec: TaskSection) => sec.id === task.section_id);
  const categoryColorProps = category ? getCategoryColorProps(category.color) : null;

  const subtasks = allTasks.filter((subtask) => subtask.parent_task_id === task.id);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" onClick={onClose}>
          <X className="h-5 w-5 mr-2" /> Close Focus
        </Button>
        <h1 className="text-xl font-bold">{task.description}</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => onOpenDetail(task)}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button onClick={onComplete}>
            <Play className="h-4 w-4 mr-2" /> Complete
          </Button>
          <Button variant="secondary" onClick={onSkip}>
            <X className="h-4 w-4 mr-2" /> Skip
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Task Details */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">{task.description}</h2>

          <div className="flex flex-wrap gap-2 text-sm text-gray-500">
            {task.priority && (
              <Badge
                variant="outline"
                className={cn(
                  'px-2 py-0.5 rounded-full border',
                  getPriorityClasses(task.priority)
                )}
              >
                {task.priority}
              </Badge>
            )}
            {task.due_date && (
              <Badge
                variant="outline"
                className={cn(
                  'px-2 py-0.5 rounded-full border',
                  isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))
                    ? 'border-red-500 text-red-500 bg-red-50'
                    : 'border-gray-300 text-gray-600'
                )}
              >
                <span className="mr-1">🗓️</span> {getDueDateText(task.due_date)}
              </Badge>
            )}
            {category && (
              <Badge
                variant="outline"
                className={cn(
                  'px-2 py-0.5 rounded-full border',
                  categoryColorProps?.dotBorder,
                  categoryColorProps?.dotColor,
                  categoryColorProps?.backgroundClass
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full mr-1',
                    categoryColorProps?.dotColor
                  )}
                  style={{ backgroundColor: categoryColorProps?.bg }}
                />
                {category.name}
              </Badge>
            )}
            {section && (
              <Badge variant="outline" className="px-2 py-0.5 rounded-full border border-gray-300 text-gray-600">
                <span className="mr-1">📂</span> {section.name}
              </Badge>
            )}
          </div>

          {task.notes && (
            <div>
              <h3 className="font-semibold">Notes:</h3>
              <Textarea readOnly value={task.notes} className="min-h-[100px]" />
            </div>
          )}

          {task.link && (
            <div>
              <h3 className="font-semibold">Link:</h3>
              <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center">
                <Link className="h-4 w-4 mr-1" /> {task.link}
              </a>
            </div>
          )}

          {task.image_url && (
            <div>
              <h3 className="font-semibold">Image:</h3>
              <img src={task.image_url} alt="Task related" className="max-w-full h-auto rounded-md mt-2" />
            </div>
          )}
        </div>

        {/* Subtasks Section */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold">Subtasks</h3>
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Add a subtask..."
              value={newSubtaskDescription}
              onChange={(e) => setNewSubtaskDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSubtask();
                }
              }}
            />
            <Button onClick={handleAddSubtask} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {subtasks.length === 0 ? (
              <p className="text-gray-500">No subtasks yet. Add one above!</p>
            ) : (
              subtasks.map((subtask) => (
                <TaskItem
                  key={subtask.id}
                  task={subtask}
                  allTasks={allTasks}
                  sections={sections}
                  allCategories={allCategories}
                  onStatusChange={handleSubtaskStatusChange}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onOpenOverview={() => {}} // Not applicable for subtasks in focus view
                  onOpenDetail={onOpenDetail}
                  onAddTask={onAddTask}
                  onReorderTasks={onReorderTasks}
                  level={1}
                  createSection={createSection}
                  updateSection={updateSection}
                  deleteSection={deleteSection}
                  updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                  createCategory={createCategory}
                  updateCategory={updateCategory}
                  deleteCategory={deleteCategory}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullScreenFocusView;