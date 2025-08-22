"use client";

import React, { useState } from 'react'; // Removed unused useRef, useEffect
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Task, TaskSection, TaskCategory } from '@/types/task'; // Corrected import
import { useSound } from '@/context/SoundContext';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Flag, StickyNote, Link as LinkIcon, Image as ImageIcon, Repeat, FolderOpen, ChevronDown, ChevronUp } from 'lucide-react'; // Imported FolderOpen, Flag
import TaskOverviewDialog from './TaskOverviewDialog';
import { getCategoryColorProps } from '@/lib/categoryColors';

interface TaskItemProps {
  task: Task;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleDoToday?: (taskId: string, date: Date) => void;
  isDoTodayOff?: boolean;
  allTasks: Task[]; // For subtasks
  sections: TaskSection[]; // For section names
  categories: TaskCategory[]; // For category names
  isSubtask?: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
  showSection?: boolean;
  showCategory?: boolean;
  showDueDate?: boolean;
  showPriority?: boolean;
  showNotes?: boolean;
  showLink?: boolean;
  showImage?: boolean;
  showRecurring?: boolean;
  showSubtasks?: boolean;
  showDoTodayToggle?: boolean;
  onOpenTaskDetail?: (task: Task) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onUpdateTask,
  onDeleteTask,
  onToggleDoToday,
  isDoTodayOff = false,
  allTasks,
  sections,
  categories,
  isSubtask = false,
  isDragging = false,
  isOverlay = false,
  showSection = true,
  showCategory = true,
  showDueDate = true,
  showPriority = true,
  showNotes = true,
  showLink = true,
  showImage = true,
  showRecurring = true,
  showSubtasks = true,
  showDoTodayToggle = true,
  onOpenTaskDetail,
}) => {
  const { playSound } = useSound();
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isSubtasksExpanded, setIsSubtasksExpanded] = useState(false);

  const subtasks = allTasks.filter(sub => sub.parent_task_id === task.id);

  const handleCheckboxChange = (checked: boolean) => {
    const newStatus = checked ? 'completed' : 'to-do';
    onUpdateTask(task.id, { status: newStatus });
    if (checked) {
      playSound('complete');
    }
  };

  const handleOpenOverview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenTaskDetail) {
      onOpenTaskDetail(task);
    } else {
      setIsOverviewOpen(true);
    }
  };

  const handleCloseOverview = () => {
    setIsOverviewOpen(false);
  };

  const getDueDateClasses = () => {
    if (!task.due_date) return "";
    const dueDate = parseISO(task.due_date);
    if (isPast(dueDate) && !isToday(dueDate) && task.status !== 'completed') {
      return "text-destructive font-medium";
    }
    if (isToday(dueDate) && task.status !== 'completed') {
      return "text-orange-500 font-medium";
    }
    if (isTomorrow(dueDate) && task.status !== 'completed') {
      return "text-yellow-500";
    }
    return "text-muted-foreground";
  };

  const getPriorityClasses = () => {
    switch (task.priority) {
      case 'urgent': return "text-red-600 font-bold";
      case 'high': return "text-orange-500 font-medium";
      case 'medium': return "text-yellow-500";
      case 'low': return "text-green-500";
      default: return "text-muted-foreground";
    }
  };

  const category = categories.find(cat => cat.id === task.category);
  const categoryProps = category ? getCategoryColorProps(category.color) : null;
  const section = sections.find(sec => sec.id === task.section_id);

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded-md transition-all duration-200 ease-in-out",
          task.status === 'completed' ? "bg-muted/50 line-through text-muted-foreground" : "bg-card hover:bg-accent/50",
          isDragging && !isOverlay ? "opacity-0" : "opacity-100",
          isOverlay ? "ring-2 ring-primary shadow-lg" : "",
          isSubtask ? "ml-6 border-l pl-2" : ""
        )}
        onClick={handleOpenOverview}
      >
        <Checkbox
          id={`task-${task.id}`}
          checked={task.status === 'completed'}
          onCheckedChange={handleCheckboxChange}
          className="flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1 grid gap-1 cursor-pointer">
          <label
            htmlFor={`task-${task.id}`}
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              task.status === 'completed' ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {task.description}
          </label>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {showSection && section && (
              <span className="flex items-center gap-1">
                <FolderOpen className="h-3 w-3" /> {section.name}
              </span>
            )}
            {showCategory && category && (
              <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-white", categoryProps?.backgroundClass)}>
                {category.name}
              </span>
            )}
            {showDueDate && task.due_date && (
              <span className={cn("flex items-center gap-1", getDueDateClasses())}>
                <CalendarIcon className="h-3 w-3" /> {format(parseISO(task.due_date), 'MMM d')}
              </span>
            )}
            {showPriority && task.priority && task.priority !== 'none' && (
              <span className={cn("flex items-center gap-1", getPriorityClasses())}>
                <Flag className="h-3 w-3" /> {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </span>
            )}
            {showRecurring && task.recurring_type && task.recurring_type !== 'none' && (
              <span className="flex items-center gap-1">
                <Repeat className="h-3 w-3" /> {task.recurring_type.charAt(0).toUpperCase() + task.recurring_type.slice(1)}
              </span>
            )}
            {showNotes && task.notes && (
              <span className="flex items-center gap-1">
                <StickyNote className="h-3 w-3" /> Notes
              </span>
            )}
            {showLink && task.link && (
              <span className="flex items-center gap-1">
                <LinkIcon className="h-3 w-3" /> Link
              </span>
            )}
            {showImage && task.image_url && (
              <span className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> Image
              </span>
            )}
          </div>
        </div>
        {showDoTodayToggle && onToggleDoToday && (
          <Button
            variant={isDoTodayOff ? "secondary" : "outline"}
            size="sm"
            className={cn("h-7 px-2 text-xs", isDoTodayOff ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent")}
            onClick={(e) => {
              e.stopPropagation();
              onToggleDoToday(task.id, new Date());
            }}
          >
            {isDoTodayOff ? "Do Today" : "Skip Today"}
          </Button>
        )}
      </div>

      {showSubtasks && subtasks.length > 0 && (
        <div className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSubtasksExpanded(!isSubtasksExpanded)}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            {isSubtasksExpanded ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
            {subtasks.length} Subtask{subtasks.length > 1 ? 's' : ''}
          </Button>
          {isSubtasksExpanded && (
            <div className="space-y-2 mt-2">
              {subtasks.map(subtask => (
                <TaskItem
                  key={subtask.id}
                  task={subtask}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  allTasks={allTasks}
                  sections={sections}
                  categories={categories}
                  isSubtask={true}
                  showSection={false}
                  showCategory={false}
                  showDueDate={true}
                  showPriority={true}
                  showNotes={false}
                  showLink={false}
                  showImage={false}
                  showRecurring={false}
                  showSubtasks={false}
                  showDoTodayToggle={showDoTodayToggle}
                  onToggleDoToday={onToggleDoToday}
                  isDoTodayOff={isDoTodayOff}
                  onOpenTaskDetail={onOpenTaskDetail}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <TaskOverviewDialog
        isOpen={isOverviewOpen}
        onClose={handleCloseOverview}
        task={task}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        allTasks={allTasks}
        sections={sections}
        categories={categories}
        onToggleDoToday={onToggleDoToday}
        isDoTodayOff={isDoTodayOff}
      />
    </>
  );
};

export default TaskItem;