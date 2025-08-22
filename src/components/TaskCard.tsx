"use client";

import { Task, TaskCategory } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface TaskCardProps {
  task: Task;
  categories: TaskCategory[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export function TaskCard({ task, categories, onEdit, onDelete }: TaskCardProps) {
  const category = categories.find((cat) => cat.id === task.category);
  const categoryColor = category?.color || "gray";

  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && task.status !== "completed";

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center space-x-2">
          <Badge
            className={cn(
              "px-2 py-1 rounded-full text-xs",
              `bg-${categoryColor}-500 text-white`
            )}
          >
            {category?.name || "No Category"}
          </Badge>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              Overdue
            </Badge>
          )}
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold">{task.description}</p>
        {dueDate && (
          <p className="text-sm text-muted-foreground mt-1">
            Due: {format(dueDate, "MMM dd, yyyy")}
          </p>
        )}
        {task.priority && (
          <Badge
            variant="outline"
            className={cn(
              "mt-2 text-xs",
              task.priority === "urgent" && "border-red-500 text-red-500",
              task.priority === "high" && "border-orange-500 text-orange-500",
              task.priority === "medium" && "border-yellow-500 text-yellow-500",
              task.priority === "low" && "border-blue-500 text-blue-500"
            )}
          >
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}