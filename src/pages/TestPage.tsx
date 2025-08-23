"use client";

import React, { useState } from "react";
import TaskSection from "@/components/tasks/TaskSection";
import { Task, TaskSection as TaskSectionType } from "@/types"; // Removed TaskCategory, DoTodayOffEntry
import { useUser } from "@supabase/auth-helpers-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

const TestPage: React.FC = () => {
  const user = useUser();
  const userId = user?.id || "mock-user-id"; // Use a mock user ID if not logged in

  // Mock Data for testing
  const [mockSections] = useState<TaskSectionType[]>([ // Removed setMockSections as it's unused
    { id: "section-1", name: "Test Section 1 (with tasks)", user_id: userId, order: 0, include_in_focus_mode: true },
    { id: "section-2", name: "Test Section 2 (empty)", user_id: userId, order: 1, include_in_focus_mode: true },
  ]);

  const [mockTasks, setMockTasks] = useState<Task[]>([
    {
      id: "task-1",
      description: "Test Task 1",
      status: "to-do",
      created_at: new Date().toISOString(),
      user_id: userId,
      priority: "high",
      section_id: "section-1",
      order: 0,
    },
    {
      id: "task-2",
      description: "Test Task 2 (Subtask of Task 1)",
      status: "to-do",
      created_at: new Date().toISOString(),
      user_id: userId,
      priority: "medium",
      section_id: "section-1",
      parent_task_id: "task-1",
      order: 1,
    },
    {
      id: "task-3",
      description: "Test Task 3",
      status: "completed",
      created_at: new Date().toISOString(),
      user_id: userId,
      priority: "low",
      section_id: "section-1",
      order: 2,
    },
  ]);

  // Mock functions for TaskSection props
  const handleAddTask = (sectionId: string, parentId?: string) => {
    const newTask: Task = {
      id: uuidv4(),
      description: `New Task in ${sectionId} ${parentId ? '(Subtask)' : ''}`,
      status: "to-do",
      created_at: new Date().toISOString(),
      user_id: userId,
      priority: "medium",
      section_id: sectionId,
      parent_task_id: parentId,
      order: mockTasks.filter(t => t.section_id === sectionId && t.parent_task_id === parentId).length,
    };
    setMockTasks((prev) => [...prev, newTask]);
    toast.success(`Added task: ${newTask.description}`);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setMockTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
    toast.success(`Updated task: ${updatedTask.description}`);
  };

  const handleTaskDelete = (taskId: string) => {
    setMockTasks((prev) => prev.filter((task) => task.id !== taskId && task.parent_task_id !== taskId));
    toast.success(`Deleted task: ${taskId}`);
  };

  const handleMoveTaskToSection = (taskId: string, newSectionId: string | null) => {
    setMockTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, section_id: newSectionId } : task))
    );
    toast(`Moved task ${taskId} to section ${newSectionId || 'None'}`); // Changed toast.info to toast
  };

  const handleMoveTaskToToday = (task: Task) => {
    toast(`Simulating move to Today for task: ${task.description}`); // Changed toast.info to toast
    // In a real app, this would update the task's section_id to the 'Today' section
  };
  const handleMoveTaskToTomorrow = (task: Task) => {
    toast(`Simulating move to Tomorrow for task: ${task.description}`); // Changed toast.info to toast
  };
  const handleMoveTaskToThisWeek = (task: Task) => {
    toast(`Simulating move to This Week for task: ${task.description}`); // Changed toast.info to toast
  };
  const handleMoveTaskToFuture = (task: Task) => {
    toast(`Simulating move to Future for task: ${task.description}`); // Changed toast.info to toast
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Task Section Test Page</h1>
      <p className="mb-4 text-gray-600">
        Use this page to test dropdown menus and drag-and-drop functionality on iPhone.
        The data here is mocked.
      </p>

      {mockSections.map((section) => (
        <TaskSection
          key={section.id}
          section={section}
          tasks={mockTasks.filter((task) => task.section_id === section.id)}
          onAddTask={(sectionId) => handleAddTask(sectionId)}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onMoveTaskToSection={handleMoveTaskToSection}
          onMoveTaskToToday={handleMoveTaskToToday}
          onMoveTaskToTomorrow={handleMoveTaskToTomorrow}
          onMoveTaskToThisWeek={handleMoveTaskToThisWeek}
          onMoveTaskToFuture={handleMoveTaskToFuture}
          allSections={mockSections}
        />
      ))}

      <div className="mt-8 p-4 border rounded-lg bg-white">
        <h2 className="text-xl font-semibold mb-4">Global Actions</h2>
        <Button onClick={() => handleAddTask("section-1")} className="mr-2">
          <Plus className="mr-2 h-4 w-4" /> Add Task to Section 1
        </Button>
        <Button onClick={() => handleAddTask("section-2")}>
          <Plus className="mr-2 h-4 w-4" /> Add Task to Section 2
        </Button>
      </div>
    </div>
  );
};

export default TestPage;