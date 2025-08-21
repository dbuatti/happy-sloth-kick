"use client";

import React, { useState, useRef, useEffect } from "react";
import { Task, TaskCategory, TaskSection } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Calendar, Tag, List, Flag, Repeat, Link, NotebookPen, Clock, Trash2, Plus, GripVertical, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, isToday, isTomorrow, isThisWeek, isPast, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TouchFriendlySwitch } from "@/components/ui/touch-friendly-switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TouchFriendlyButton } from "@/components/ui/touch-friendly-button";

interface TaskItemProps {
  task: Task;
  categories: TaskCategory[];
  sections: TaskSection[];
  onUpdate: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
  onAddTask: (parentId: string) => void;
  isSubtask?: boolean;
  subtasks?: Task[];
  onToggleDoToday: (taskId: string, doToday: boolean) => void;
  doTodayLog: Set<string>; // Changed to Set<string>
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  categories,
  sections,
  onUpdate,
  onDelete,
  onAddTask,
  isSubtask = false,
  subtasks = [],
  onToggleDoToday,
  doTodayLog,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(task.description);
  const [editedNotes, setEditedNotes] = useState(task.notes || "");
  const [editedDueDate, setEditedDueDate] = useState<Date | undefined>(
    task.due_date ? parseISO(task.due_date) : undefined
  );
  const [editedRemindAt, setEditedRemindAt] = useState<Date | undefined>(
    task.remind_at ? parseISO(task.remind_at) : undefined
  );
  const [editedCategory, setEditedCategory] = useState<string | undefined>(task.category || undefined);
  const [editedPriority, setEditedPriority] = useState<Task['priority']>(task.priority || "medium");
  const [editedSection, setEditedSection] = useState<string | undefined>(task.section_id || undefined);
  const [editedRecurringType, setEditedRecurringType] = useState<Task['recurring_type']>(task.recurring_type || "none");
  const [editedLink, setEditedLink] = useState<string>(task.link || "");
  const [editedImageUrl, setEditedImageUrl] = useState<string>(task.image_url || "");
  const [showDetails, setShowDetails] = useState(false);
  // isDoToday is true if task is NOT in doTodayLog (meaning it IS 'Do Today')
  const [isDoToday, setIsDoToday] = useState(!doTodayLog.has(task.id));

  const detailsRef = useRef<HTMLDivElement>(null);

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
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  // Update isDoToday when doTodayLog or task.id changes
  useEffect(() => {
    setIsDoToday(!doTodayLog.has(task.id));
  }, [doTodayLog, task.id]);

  const handleUpdateTask = async (updates: Partial<Task>) => {
    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", task.id)
      .select()
      .single();

    if (error) {
      toast.error("Failed to update task.");
      console.error("Error updating task:", error);
    } else if (data) {
      onUpdate(data);
      toast.success("Task updated successfully!");
    }
  };

  const handleCheckboxChange = async (checked: boolean) => {
    const newStatus = checked ? "completed" : "to-do";
    await handleUpdateTask({ status: newStatus });
  };

  const handleSaveEdit = async () => {
    const updates: Partial<Task> = {
      description: editedDescription,
      notes: editedNotes,
      due_date: editedDueDate ? editedDueDate.toISOString().split("T")[0] : null,
      remind_at: editedRemindAt ? editedRemindAt.toISOString() : null,
      category: editedCategory || null,
      priority: editedPriority,
      section_id: editedSection || null,
      recurring_type: editedRecurringType,
      link: editedLink,
      image_url: editedImageUrl,
    };
    await handleUpdateTask(updates);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedDescription(task.description);
    setEditedNotes(task.notes || "");
    setEditedDueDate(task.due_date ? parseISO(task.due_date) : undefined);
    setEditedRemindAt(task.remind_at ? parseISO(task.remind_at) : undefined);
    setEditedCategory(task.category || undefined);
    setEditedPriority(task.priority || "medium");
    setEditedSection(task.section_id || undefined);
    setEditedRecurringType(task.recurring_type || "none");
    setEditedLink(task.link || "");
    setEditedImageUrl(task.image_url || "");
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      toast.error("Failed to delete task.");
      console.error("Error deleting task:", error);
    } else {
      onDelete(task.id);
      toast.success("Task deleted successfully!");
    }
  };

  const getDueDateLabel = (date: Date | undefined) => {
    if (!date) return null;
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isThisWeek(date, { weekStartsOn: 1 })) return format(date, "EEEE");
    return format(date, "MMM dd");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-500";
      case "high":
        return "text-orange-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  const getCategoryColor = (categoryId: string | undefined) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? `bg-${category.color}-100 text-${category.color}-800` : "bg-gray-100 text-gray-800";
  };

  const handleToggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const handleToggleDoTodaySwitch = (checked: boolean) => {
    // `checked` is the new state of the switch (true if 'Do Today', false if 'Not Do Today')
    onToggleDoToday(task.id, checked);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col rounded-lg p-2 mb-2 bg-card text-card-foreground shadow-sm",
        isSubtask && "ml-6 border-l-2 border-gray-200 pl-4",
        isDragging && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-grow min-w-0">
          {!isSubtask && (
            <TouchFriendlyButton
              variant="ghost"
              size="icon"
              {...attributes}
              {...listeners}
              className="cursor-grab mr-2"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </TouchFriendlyButton>
          )}
          <Checkbox
            id={`task-${task.id}`}
            checked={task.status === "completed"}
            onCheckedChange={handleCheckboxChange}
            className="mr-3"
          />
          {isEditing ? (
            <Input
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveEdit();
                }
                if (e.key === "Escape") {
                  handleCancelEdit();
                }
              }}
              className="flex-grow"
            />
          ) : (
            <label
              htmlFor={`task-${task.id}`}
              className={cn(
                "flex-grow text-sm font-medium cursor-pointer",
                task.status === "completed" && "line-through text-muted-foreground"
              )}
              onClick={() => setIsEditing(true)}
            >
              {task.description}
            </label>
          )}
        </div>

        <div className="flex items-center space-x-2 ml-auto">
          {task.due_date && (
            <span
              className={cn(
                "text-xs px-2 py-1 rounded-full",
                isPast(parseISO(task.due_date)) && task.status !== "completed"
                  ? "bg-red-100 text-red-800"
                  : "bg-blue-100 text-blue-800"
              )}
            >
              {getDueDateLabel(parseISO(task.due_date))}
            </span>
          )}
          <TouchFriendlySwitch
            checked={isDoToday}
            onCheckedChange={handleToggleDoTodaySwitch}
            aria-label="Toggle Do Today"
            onClick={(e) => e.stopPropagation()}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TouchFriendlyButton variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </TouchFriendlyButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <NotebookPen className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleDetails}>
                <Plus className="mr-2 h-4 w-4" /> {showDetails ? "Hide Details" : "Show Details"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddTask(task.id)}>
                <Plus className="mr-2 h-4 w-4" /> Add Subtask
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showDetails && (
        <div ref={detailsRef} className="mt-4 space-y-3 text-sm">
          {isEditing ? (
            <>
              <Textarea
                placeholder="Notes"
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                className="mt-2"
              />
              <Input
                placeholder="Link (URL)"
                value={editedLink}
                onChange={(e) => setEditedLink(e.target.value)}
              />
              <Input
                placeholder="Image URL"
                value={editedImageUrl}
                onChange={(e) => setEditedImageUrl(e.target.value)}
              />
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !editedDueDate && "text-muted-foreground"
                      )}
                    >
                      {editedDueDate ? format(editedDueDate, "PPP") : <span>Pick a due date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={editedDueDate}
                      onSelect={setEditedDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {editedDueDate && (
                  <Button variant="ghost" size="icon" onClick={() => setEditedDueDate(undefined)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !editedRemindAt && "text-muted-foreground"
                      )}
                    >
                      {editedRemindAt ? format(editedRemindAt, "PPP HH:mm") : <span>Set a reminder</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={editedRemindAt}
                      onSelect={(date) => {
                        if (date) {
                          const now = new Date();
                          date.setHours(now.getHours());
                          date.setMinutes(now.getMinutes());
                          setEditedRemindAt(date);
                        } else {
                          setEditedRemindAt(undefined);
                        }
                      }}
                      initialFocus
                    />
                    {editedRemindAt && (
                      <Input
                        type="time"
                        value={format(editedRemindAt, "HH:mm")}
                        onChange={(e) => {
                          const [hours, minutes] = e.target.value.split(":").map(Number);
                          const newRemindAt = editedRemindAt ? new Date(editedRemindAt) : new Date();
                          newRemindAt.setHours(hours);
                          newRemindAt.setMinutes(minutes);
                          setEditedRemindAt(newRemindAt);
                        }}
                        className="mt-2"
                      />
                    )}
                  </PopoverContent>
                </Popover>
                {editedRemindAt && (
                  <Button variant="ghost" size="icon" onClick={() => setEditedRemindAt(undefined)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Select value={editedCategory} onValueChange={setEditedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editedCategory && (
                  <Button variant="ghost" size="icon" onClick={() => setEditedCategory(undefined)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Flag className="h-4 w-4 text-muted-foreground" />
                <Select value={editedPriority} onValueChange={(value) => setEditedPriority(value as Task['priority'])}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {["low", "medium", "high", "urgent"].map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <List className="h-4 w-4 text-muted-foreground" />
                <Select value={editedSection} onValueChange={setEditedSection}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editedSection && (
                  <Button variant="ghost" size="icon" onClick={() => setEditedSection(undefined)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <Select value={editedRecurringType} onValueChange={(value) => setEditedRecurringType(value as Task['recurring_type'])}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select recurrence" />
                  </SelectTrigger>
                  <SelectContent>
                    {["none", "daily", "weekly", "monthly"].map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>Save</Button>
              </div>
            </>
          ) : (
            <>
              {task.notes && <p className="text-muted-foreground">{task.notes}</p>}
              {task.link && (
                <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center">
                  <Link className="h-4 w-4 mr-1" /> {task.link}
                </a>
              )}
              {task.image_url && (
                <img src={task.image_url} alt="Task related" className="max-w-full h-auto rounded-md mt-2" />
              )}
              {task.remind_at && (
                <div className="flex items-center text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" /> Remind at {format(parseISO(task.remind_at), "MMM dd, HH:mm")}
                </div>
              )}
              {task.category && (
                <span className={cn("text-xs px-2 py-1 rounded-full", getCategoryColor(task.category))}>
                  {categories.find((cat) => cat.id === task.category)?.name}
                </span>
              )}
              {task.priority && (
                <span className={cn("text-xs px-2 py-1 rounded-full", getPriorityColor(task.priority))}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                </span>
              )}
              {task.section_id && (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                  Section: {sections.find((sec) => sec.id === task.section_id)?.name}
                </span>
              )}
              {task.recurring_type !== "none" && (
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                  Recurring: {task.recurring_type.charAt(0).toUpperCase() + task.recurring_type.slice(1)}
                </span>
              )}
            </>
          )}
        </div>
      )}

      {subtasks.length > 0 && (
        <div className="mt-2">
          {subtasks.map((subtask) => (
            <TaskItem
              key={subtask.id}
              task={subtask}
              categories={categories}
              sections={sections}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddTask={onAddTask}
              isSubtask={true}
              onToggleDoToday={onToggleDoToday}
              doTodayLog={doTodayLog}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskItem;