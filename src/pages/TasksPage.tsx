import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useTasks } from '@/hooks/useTasks';
import { useSections } from '@/hooks/useSections';
import { Task, TaskSection } from '@/types/task';
import { useAuth } from '@/context/AuthContext';
import { SectionHeader } from '@/components/SectionHeader'; // Assuming this component exists and is correctly typed

function TasksPage() {
  const { user } = useAuth();
  const {
    processedTasks: tasks, // Use processedTasks which includes category_color
    addTask,
    updateTask,
    deleteTask,
    loading: tasksLoading,
    error: tasksError,
  } = useTasks(user?.id);

  const {
    sections,
    addSection,
    updateSection,
    deleteSection,
    reorderSections, // Kept for completeness, though not used in this file's logic
    updateSectionIncludeInFocusMode,
    loading: sectionsLoading,
    error: sectionsError,
  } = useSections();

  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newSectionName, setNewSectionName] = useState('');

  const handleAddTask = async () => {
    if (newTaskDescription.trim() === '') return;
    await addTask({
      description: newTaskDescription,
      status: 'to-do',
      priority: 'medium',
      order: 0, // Default order, can be adjusted later
    });
    setNewTaskDescription('');
  };

  const handleAddSection = async () => {
    if (newSectionName.trim() === '') return;
    await addSection(newSectionName);
    setNewSectionName('');
  };

  const handleToggleSectionVisibility = async (sectionId: string) => {
    const section = sections.find((s: TaskSection) => s.id === sectionId); // Explicitly type 's'
    if (section) {
      await updateSectionIncludeInFocusMode(sectionId, !section.include_in_focus_mode);
    }
  };

  const activeTasks = tasks.filter((task: Task) => task.status !== 'completed'); // Ensure task is of type Task

  if (tasksLoading || sectionsLoading) {
    return <div className="p-4">Loading tasks and sections...</div>;
  }

  if (tasksError || sectionsError) {
    return <div className="p-4 text-red-500">Error: {tasksError || sectionsError}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">My Tasks</h1>

      <div className="mb-4 flex space-x-2">
        <input
          type="text"
          value={newTaskDescription}
          onChange={(e) => setNewTaskDescription(e.target.value)}
          placeholder="Add a new task"
          className="flex-grow p-2 border rounded-md"
        />
        <Button onClick={handleAddTask}>Add Task</Button>
      </div>

      <div className="mb-6 flex space-x-2">
        <input
          type="text"
          value={newSectionName}
          onChange={(e) => setNewSectionName(e.target.value)}
          placeholder="Add a new section"
          className="flex-grow p-2 border rounded-md"
        />
        <Button onClick={handleAddSection}>Add Section</Button>
      </div>

      {sections.length === 0 && tasks.length === 0 ? (
        <p className="text-gray-500">No tasks or sections yet. Start by adding one!</p>
      ) : (
        <div className="space-y-6">
          {sections.map((section: TaskSection) => {
            const sectionTasks = activeTasks.filter((task: Task) => task.section_id === section.id);
            return (
              <div key={section.id} className="border rounded-lg p-4 shadow-sm">
                <SectionHeader
                  section={section}
                  taskCount={sectionTasks.length}
                  onToggleVisibility={() => handleToggleSectionVisibility(section.id)}
                />
                <div className="mt-4 space-y-2">
                  {sectionTasks.length > 0 ? (
                    sectionTasks.map((task: Task) => (
                      <div key={task.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <span>{task.description}</span>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => updateTask(task.id, { status: 'completed' })}>Complete</Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteTask(task.id)}>Delete</Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">No tasks in this section.</p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Tasks without a section */}
          {activeTasks.filter(task => !task.section_id).length > 0 && (
            <div className="border rounded-lg p-4 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Uncategorized Tasks</h2>
              <div className="space-y-2">
                {activeTasks.filter(task => !task.section_id).map((task: Task) => (
                  <div key={task.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                    <span>{task.description}</span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => updateTask(task.id, { status: 'completed' })}>Complete</Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteTask(task.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TasksPage;