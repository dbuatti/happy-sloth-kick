import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Play,
  Check,
  X,
  Edit,
  Trash2,
  Plus,
  Link,
  Image,
} from 'lucide-react'; // Removed unused Checkbox, ListTodo, Timer, MessageSquare
import { cn } from '@/lib/utils';
import { Task, TaskStatus, TaskPriority } from '@/types/task'; // Removed unused TaskSection, TaskCategory, RecurringType
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { getCategoryColorProps } from '@/utils/categoryColors';
import TaskItem from './TaskItem';
import { FullScreenFocusViewProps } from '@/types/props';
import { Badge } from '@/components/ui/badge';

const FullScreenFocusView: React.FC<FullScreenFocusViewProps> = ({
  task,
  onClose,
  onComplete,
  onSkip,
  onOpenDetail,
  updateTask,
  sections,
  categories,
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
}) => {
  const [isConfirmCompleteOpen, setIsConfirmCompleteOpen] = useState(false);
  const [isConfirmSkipOpen, setIsConfirmSkipOpen] = useState(false);
  const [newSubtaskDescription, setNewSubtaskDescription] = useState('');

  useEffect(() => {
    if (!task) {
      onClose();
    }
  }, [task, onClose]);

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

  const handleSubtaskStatusChange = async (subtaskId: string, newStatus: TaskStatus) => {
    await updateTask(subtaskId, { status: newStatus });
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

  const category = categories.find((cat) => cat.id === task.category);
  const section = sections.find((sec) => sec.id === task.section_id);
  const categoryColorProps = category ? getCategoryColorProps(category.color) : null;

  const subtasks = allTasks.filter((subtask) => subtask.parent_task_id === task.id);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" onClick={onClose}>
          <X className="h-5 w-5 mr-2" /> Close Focus
        </Button>
        <h1 className="text-xl font-bold">Focus Mode</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => onOpenDetail(task)}>
            <Edit className="h-4 w-4 mr-2" /> Edit Task
          </Button>
          <Button variant="destructive" onClick={() => setIsConfirmSkipOpen(true)}>
            <X className="h-4 w-4 mr-2" /> Skip
          </Button>
          <Button onClick={() => setIsConfirmCompleteOpen(true)}>
            <Check className="h-4 w-4 mr-2" /> Complete
          </Button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card p-6 rounded-lg shadow-md">
            <h2 className="text-3xl font-bold mb-2">{task.description}</h2>
            <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-4">
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
                <h3 className="font-semibold text-lg mb-1">Notes:</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{task.notes}</p>
              </div>
            )}

            {task.link && (
              <div className="mt-4">
                <h3 className="font-semibold text-lg mb-1">Link:</h3>
                <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center">
                  <Link className="h-4 w-4 mr-1" /> {task.link}
                </a>
              </div>
            )}

            {task.image_url && (
              <div className="mt-4">
                <h3 className="font-semibold text-lg mb-1">Image:</h3>
                <img src={task.image_url} alt="Task related" className="max-w-full h-auto rounded-md mt-2" />
              </div>
            )}
          </div>

          {subtasks.length > 0 && (
            <div className="bg-card p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">Subtasks:</h3>
              <div className="space-y-2">
                {subtasks.map((subtask) => (
                  <TaskItem
                    key={subtask.id}
                    task={subtask}
                    allTasks={allTasks}
                    sections={sections}
                    categories={categories}
                    onStatusChange={handleSubtaskStatusChange}
                    onUpdate={updateTask}
                    onDelete={deleteTask}
                    onOpenOverview={() => {}} // No overview for subtasks in focus view
                    onOpenDetail={onOpenDetail}
                    onAddTask={onAddTask}
                    onReorderTasks={onReorderTasks}
                    level={1}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="bg-card p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Add Subtask:</h3>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="New subtask description"
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
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          {/* Placeholder for Focus Tools Panel or other widgets */}
          <div className="bg-card p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Focus Tools</h3>
            <p className="text-gray-500">Timer, notes, and other focus-related tools can go here.</p>
            {/* Example: Timer */}
            <div className="flex items-center justify-center space-x-4 mt-4">
              <Button variant="outline" size="icon">
                <Play className="h-5 w-5" />
              </Button>
              <span className="text-2xl font-mono">25:00</span>
              <Button variant="outline" size="icon">
                <Pause className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isConfirmCompleteOpen} onOpenChange={setIsConfirmCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Completion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to mark this task as completed?</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsConfirmCompleteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onComplete}>
              Complete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmSkipOpen} onOpenChange={setIsConfirmSkipOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Skip</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to skip this task?</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsConfirmSkipOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onSkip}>
              Skip Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FullScreenFocusView;