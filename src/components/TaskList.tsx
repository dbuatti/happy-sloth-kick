import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { useTasks } from "@/hooks/useTasks";
import TaskFilter from "./TaskFilter";
import AddTaskForm from "./AddTaskForm";
import TaskItem from "./TaskItem";
import DateNavigator from "./DateNavigator";
import BulkActions from "./BulkActions";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts";

const TaskList: React.FC = () => {
  const {
    tasks,
    filteredTasks,
    loading,
    currentDate,
    setCurrentDate,
    userId,
    handleAddTask,
    updateTask,
    deleteTask,
    applyFilters,
    selectedTaskIds,
    toggleTaskSelection,
    clearSelectedTasks,
    bulkUpdateTasks,
  } = useTasks();

  const handlePreviousDay = (e: KeyboardEvent) => { // Added e: KeyboardEvent
    setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() - 1)));
  };

  const handleNextDay = (e: KeyboardEvent) => { // Added e: KeyboardEvent
    setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() + 1)));
  };

  // Define a specific handler for status changes to match TaskItem's prop type
  const handleTaskStatusChange = async (taskId: string, newStatus: 'to-do' | 'completed' | 'skipped' | 'archived') => {
    await updateTask(taskId, { status: newStatus });
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'arrowleft': handlePreviousDay,
    'arrowright': handleNextDay,
    'n': () => {
      const input = document.getElementById('new-task-description');
      if (input) {
        input.focus();
      }
    },
    'f': () => {
      const searchInput = document.querySelector('input[placeholder="Search tasks..."]');
      if (searchInput) {
        (searchInput as HTMLInputElement).focus();
      }
    },
  });

  if (loading) {
    return <div className="text-center p-8">Loading tasks...</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center">Daily Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <DateNavigator
          currentDate={currentDate}
          onPreviousDay={handlePreviousDay}
          onNextDay={handleNextDay}
        />

        <TaskFilter onFilterChange={applyFilters} />

        <AddTaskForm onAddTask={handleAddTask} userId={userId} />

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Your Tasks</h2>
          <div className="text-sm text-gray-500">
            {filteredTasks.length} of {tasks.length} tasks shown
          </div>
        </div>
        
        {filteredTasks.length === 0 ? (
          <div className="text-center text-gray-500 p-8">
            {tasks.length === 0 ? (
              <>
                <p className="text-lg mb-2">No tasks found for this day!</p>
                <p>Start by adding a new task above, or navigate to a different day.</p>
              </>
            ) : (
              <>
                <p className="text-lg mb-2">No tasks match your current filters.</p>
                <p>Try adjusting your search or filter options.</p>
              </>
            )}
          </div>
        ) : (
          <div>
            <ul className="space-y-3">
              {filteredTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  userId={userId}
                  onStatusChange={handleTaskStatusChange} {/* Use the new specific handler */}
                  onDelete={deleteTask}
                  onUpdate={updateTask}
                  isSelected={selectedTaskIds.includes(task.id)}
                  onToggleSelect={toggleTaskSelection}
                />
              ))}
            </ul>

            <BulkActions 
              selectedTaskIds={selectedTaskIds} 
              onAction={bulkUpdateTasks} 
              onClearSelection={clearSelectedTasks} 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskList;