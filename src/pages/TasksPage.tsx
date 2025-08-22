import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useTasks } from '@/hooks/useTasks';
import { useSections } from '@/hooks/useSections';
import { Task, TaskSection } from '@/types/task';
import { useAuth } from '@/context/AuthContext';
import { SectionHeader } from '@/components/SectionHeader'; // Assuming this component exists and takes TaskSection

function TasksPage() {
  const { user } = useAuth();
  const {
    processedTasks: tasks, // Use processedTasks which includes category_color
    addTask: handleAddTask, // Renamed to avoid conflict with local function
    updateTask,
    deleteTask,
    loading: tasksLoading,
    reorderTasks,
    toggleTaskStatus,
    toggleTaskFocus,
    focusedTaskId,
  } = useTasks();
  const {
    sections,
    addSection,
    updateSection,
    deleteSection,
    reorderSections, // Kept for completeness, though not used in this file's logic
    updateSectionIncludeInFocusMode,
    loading: sectionsLoading,
  } = useSections();

  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newSectionName, setNewSectionName] = useState('');

  const handleAddTaskClick = async () => {
    if (newTaskDescription.trim() && user) {
      await handleAddTask(newTaskDescription);
      setNewTaskDescription('');
    }
  };

  const handleAddSectionClick = async () => {
    if (newSectionName.trim() && user) {
      await addSection(newSectionName);
      setNewSectionName('');
    }
  };

  const handleToggleSectionVisibility = async (sectionId: string) => {
    const section = sections.find((s: TaskSection) => s.id === sectionId); // Explicitly type 's'
    if (section) {
      await updateSectionIncludeInFocusMode(sectionId, !section.include_in_focus_mode);
    }
  };

  if (tasksLoading || sectionsLoading) {
    return <div className="p-4 text-center">Loading tasks and sections...</div>;
  }

  const activeTasks = tasks.filter(task => task.status !== 'completed');

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">My Tasks</h1>

      <div className="mb-6 p-4 border rounded-lg shadow-sm bg-white">
        <h2 className="text-xl font-semibold mb-3">Add New Task</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            placeholder="Task description"
            className="flex-grow p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={handleAddTaskClick} className="bg-blue-600 hover:bg-blue-700 text-white">Add Task</Button>
        </div>
      </div>

      <div className="mb-6 p-4 border rounded-lg shadow-sm bg-white">
        <h2 className="text-xl font-semibold mb-3">Add New Section</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            placeholder="Section name"
            className="flex-grow p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={handleAddSectionClick} className="bg-green-600 hover:bg-green-700 text-white">Add Section</Button>
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((section: TaskSection) => {
            const sectionTasks = activeTasks.filter((task: Task) => task.section_id === section.id);
            return (
              <div key={section.id} className="border rounded-lg shadow-sm bg-white">
                <SectionHeader
                  section={section}
                  taskCount={sectionTasks.length}
                  onToggleVisibility={() => handleToggleSectionVisibility(section.id)}
                />
                <div className="p-4 space-y-3">
                  {sectionTasks.length === 0 ? (
                    <p className="text-gray-500 italic">No tasks in this section.</p>
                  ) : (
                    sectionTasks.map((task: Task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={task.status === 'completed'}
                            onChange={() => toggleTaskStatus(task.id, task.status)}
                            className="form-checkbox h-5 w-5 text-blue-600 rounded"
                          />
                          <span className={`text-lg ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                            {task.description}
                          </span>
                          {task.category_color && (
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{ backgroundColor: task.category_color }}
                              title={`Category: ${task.category}`}
                            ></span>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleTaskFocus(task.id === focusedTaskId ? null : task.id)}
                            className={task.id === focusedTaskId ? "bg-yellow-200" : ""}
                          >
                            {task.id === focusedTaskId ? "Unfocus" : "Focus"}
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteTask(task.id)}>Delete</Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}

        {/* Tasks without a section */}
        <div className="border rounded-lg shadow-sm bg-white">
          <SectionHeader
            section={{ id: 'no-section', name: 'Tasks Without Section', user_id: user?.id || '', order: null, created_at: new Date().toISOString(), include_in_focus_mode: true }}
            taskCount={activeTasks.filter(task => !task.section_id).length}
            onToggleVisibility={() => { /* No visibility toggle for this virtual section */ }}
          />
          <div className="p-4 space-y-3">
            {activeTasks.filter(task => !task.section_id).length === 0 ? (
              <p className="text-gray-500 italic">No tasks without a section.</p>
            ) : (
              activeTasks.filter(task => !task.section_id).map((task: Task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={() => toggleTaskStatus(task.id, task.status)}
                      className="form-checkbox h-5 w-5 text-blue-600 rounded"
                    />
                    <span className={`text-lg ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                      {task.description}
                    </span>
                    {task.category_color && (
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: task.category_color }}
                        title={`Category: ${task.category}`}
                      ></span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleTaskFocus(task.id === focusedTaskId ? null : task.id)}
                      className={task.id === focusedTaskId ? "bg-yellow-200" : ""}
                    >
                      {task.id === focusedTaskId ? "Unfocus" : "Focus"}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteTask(task.id)}>Delete</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TasksPage;