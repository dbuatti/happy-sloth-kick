import React, { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { useTasks } from "@/hooks/useTasks";
import TaskFilter from "./TaskFilter";
import AddTaskForm from "./AddTaskForm";
import TaskItem from "./TaskItem";
import DateNavigator from "./DateNavigator";
import BulkActions from "./BulkActions";
import useKeyboardShortcuts, { ShortcutMap } from "@/hooks/useKeyboardShortcuts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderOpen } from 'lucide-react';
import QuickAddTask from './QuickAddTask'; // Import the new QuickAddTask component

interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  created_at: string;
  user_id: string;
  category: string;
  priority: string;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
}

interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
}

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
    sections,
  } = useTasks();

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() - 1)));
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() + 1)));
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: 'to-do' | 'completed' | 'skipped' | 'archived') => {
    await updateTask(taskId, { status: newStatus });
  };

  const handleSortChange = (value: string) => {
    const [key, direction] = value.split('_');
    setSortKey(key as 'priority' | 'due_date' | 'created_at');
    setSortDirection(direction as 'asc' | 'desc');
  };

  const tasksGroupedBySection = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    const noSectionId = 'no-section';

    sections.forEach(section => {
      grouped[section.id] = [];
    });
    grouped[noSectionId] = [];

    filteredTasks.forEach(task => {
      if (task.section_id && grouped[task.section_id]) {
        grouped[task.section_id].push(task);
      } else {
        grouped[noSectionId].push(task);
      }
    });

    const orderedSections: { id: string; name: string }[] = [];
    if (grouped[noSectionId].length > 0) {
      orderedSections.push({ id: noSectionId, name: 'No Section' });
    }
    sections.forEach(section => {
      if (grouped[section.id] && grouped[section.id].length > 0) {
        orderedSections.push(section);
      }
    });

    return orderedSections.map(section => ({
      ...section,
      tasks: grouped[section.id],
    }));
  }, [filteredTasks, sections]);

  const shortcuts: ShortcutMap = {
    'arrowleft': handlePreviousDay,
    'arrowright': handleNextDay,
    'n': (e) => {
      const input = document.getElementById('new-task-description');
      if (input) {
        input.focus();
      }
    },
    'f': (e) => {
      const searchInput = document.querySelector('input[placeholder="Search tasks..."]');
      if (searchInput) {
        (searchInput as HTMLInputElement).focus();
      }
    },
  };
  useKeyboardShortcuts(shortcuts);

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

        <AddTaskForm onAddTask={handleAddTask} userId={userId} />

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
          <div className="space-y-6">
            {tasksGroupedBySection.map(sectionGroup => (
              <div key={sectionGroup.id} className="space-y-3">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  {sectionGroup.name} ({sectionGroup.tasks.length})
                </h3>
                <ul className="space-y-3">
                  {sectionGroup.tasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      userId={userId}
                      onStatusChange={handleTaskStatusChange}
                      onDelete={deleteTask}
                      onUpdate={updateTask}
                      isSelected={selectedTaskIds.includes(task.id)}
                      onToggleSelect={toggleTaskSelection}
                      sections={sections}
                    />
                  ))}
                </ul>
              </div>
            ))}

            <BulkActions 
              selectedTaskIds={selectedTaskIds} 
              onAction={bulkUpdateTasks} 
              onClearSelection={clearSelectedTasks} 
            />
          </div>
        )}
        <QuickAddTask onAddTask={handleAddTask} userId={userId} /> {/* New quick add field at the bottom */}
      </CardContent>
    </Card>
  );
};

export default TaskList;