import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { useTasks } from "@/hooks/useTasks";
import TaskFilter from "./TaskFilter";
import AddTaskForm from "./AddTaskForm";
import TaskItem from "./TaskItem";
import DateNavigator from "./DateNavigator";
import BulkActions from "./BulkActions";
import useKeyboardShortcuts, { ShortcutMap } from "@/hooks/useKeyboardShortcuts"; // Import ShortcutMap
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
  } = useTasks();

  const handlePreviousDay = () => { // Removed e: KeyboardEvent
    setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() - 1)));
  };

  const handleNextDay = () => { // Removed e: KeyboardEvent
    setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() + 1)));
  };

  // Define a specific handler for status changes to match TaskItem's prop type
  const handleTaskStatusChange = async (taskId: string, newStatus: 'to-do' | 'completed' | 'skipped' | 'archived') => {
    await updateTask(taskId, { status: newStatus });
  };

  const handleSortChange = (value: string) => {
    const [key, direction] = value.split('_');
    setSortKey(key as 'priority' | 'due_date' | 'created_at');
    setSortDirection(direction as 'asc' | 'desc');
  };

  // Keyboard shortcuts
  const shortcuts: ShortcutMap = { // Explicitly type the shortcuts object
    'arrowleft': handlePreviousDay,
    'arrowright': handleNextDay,
    'n': (e) => { // Keep 'e' here as the hook passes it
      const input = document.getElementById('new-task-description');
      if (input) {
        input.focus();
      }
    },
    'f': (e) => { // Keep 'e' here as the hook passes it
      const searchInput = document.querySelector('input[placeholder="Search tasks..."]');
      if (searchInput) {
        (searchInput as HTMLInputElement).focus();
      }
    },
  };
  useKeyboardShortcuts(shortcuts); // Pass the explicitly typed object

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

        <div className="flex justify-end mb-4">
          <Select value={`${sortKey}_${sortDirection}`} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority_desc">Priority (High to Low)</SelectItem>
              <SelectItem value="priority_asc">Priority (Low to High)</SelectItem>
              <SelectItem value="due_date_asc">Due Date (Soonest)</SelectItem>
              <SelectItem value="due_date_desc">Due Date (Latest)</SelectItem>
              <SelectItem value="created_at_desc">Created At (Newest)</SelectItem>
              <SelectItem value="created_at_asc">Created At (Oldest)</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
                  onStatusChange={handleTaskStatusChange}
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