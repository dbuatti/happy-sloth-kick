"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import SectionHeader from '@/components/tasks/SectionHeader';
import { useTasks, Task, TaskSection } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';

const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const isDemo = user?.id === 'd889323b-350c-4764-9788-6359f85f6142';
  
  const { 
    tasks, 
    handleAddTask: addTask,
    // updateTask, // Removed: declared but its value is never read
    // deleteTask, // Removed: declared but its value is never read
    sections, 
    createSection: addSection,
    updateSection, 
    deleteSection, 
    // reorderSections, // Removed: declared but its value is never read
    updateSectionIncludeInFocusMode,
  } = useTasks({ currentDate: new Date(), userId: user?.id });
  
  const [newTaskDescription, setNewTaskDescription] = useState('');

  // Filter out archived tasks for display
  const activeTasks = tasks.filter(task => task.status !== 'archived');

  const handleAddTask = async () => {
    if (newTaskDescription.trim()) {
      await addTask({ description: newTaskDescription.trim(), category: '', priority: 'medium' });
      setNewTaskDescription('');
    }
  };

  const handleRenameSection = async (sectionId: string, newName: string) => {
    await updateSection(sectionId, newName);
  };

  const handleDeleteSection = async (sectionId: string) => {
    const sectionTasks = tasks.filter(task => task.section_id === sectionId);
    if (sectionTasks.length > 0) {
      console.error("Cannot delete section with tasks");
      return;
    }
    await deleteSection(sectionId);
  };

  const handleAddTaskToSection = async (sectionId: string) => {
    await addTask({ 
      description: 'New task', 
      section_id: sectionId,
      category: '',
      priority: 'medium',
    });
  };

  const handleToggleSectionVisibility = async (sectionId: string) => {
    const section = sections.find((s: TaskSection) => s.id === sectionId);
    if (section) {
      await updateSectionIncludeInFocusMode(sectionId, !section.include_in_focus_mode);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              placeholder="Add a new task..."
              className="pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
            />
            <Button
              onClick={handleAddTask}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              variant="ghost"
              aria-label="Add task"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {sections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No sections yet.</p>
            <Button 
              onClick={() => addSection('New Section')}
              className="mt-4"
            >
              Create your first section
            </Button>
          </div>
        ) : (
          sections.map((section: TaskSection) => {
            // Removed explicit (task: Task) type annotation to resolve TS2769
            const sectionTasks = activeTasks.filter(task => task.section_id === section.id);
            return (
              <div key={section.id} className="bg-card rounded-lg shadow-sm border">
                <SectionHeader
                  section={section}
                  taskCount={sectionTasks.length}
                  onRename={handleRenameSection}
                  onDelete={handleDeleteSection}
                  onAddTask={handleAddTaskToSection}
                  onToggleVisibility={handleToggleSectionVisibility}
                  isDemo={isDemo}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TasksPage;