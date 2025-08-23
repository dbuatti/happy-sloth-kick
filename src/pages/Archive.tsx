import React, { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { Task, TaskCategory } from '@/types';
import TaskItem from '@/components/TaskItem';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';

const Archive = () => {
  const { userId: currentUserId } = useAuth();
  const {
    tasks: allTasks,
    categories,
    loading,
    error,
    updateTask,
    deleteTask,
    addTask,
    filterStatus,
    setFilterStatus,
    filterCategory,
    setFilterCategory,
    filterPriority,
    setFilterPriority,
    searchQuery,
    setSearchQuery,
    setShowCompleted,
  } = useTasks({ userId: currentUserId! });

  // Ensure showCompleted is true for archive
  React.useEffect(() => {
    setShowCompleted(true);
  }, [setShowCompleted]);

  const archivedTasks = useMemo(() => {
    return allTasks.filter(task => task.status === 'completed');
  }, [allTasks]);

  const filteredArchivedTasks = useMemo(() => {
    let filtered = archivedTasks;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(task => task.category === filterCategory);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [archivedTasks, filterStatus, filterCategory, filterPriority, searchQuery]);

  const renderSubtasks = (parentTaskId: string) => {
    const subtasks = allTasks.filter(sub => sub.parent_task_id === parentTaskId);
    return (
      <div className="ml-4 border-l pl-4 space-y-2">
        {subtasks.map(subtask => (
          <TaskItem
            key={subtask.id}
            task={subtask}
            categories={categories as TaskCategory[]}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onAddSubtask={async (description, parentTaskId) => { await addTask(description, null, parentTaskId); }}
            onToggleFocusMode={async () => {}}
            onLogDoTodayOff={async () => {}}
            isFocusedTask={false}
            subtasks={[]} // Subtasks don't have further nested subtasks in this view
            renderSubtasks={() => null}
          />
        ))}
      </div>
    );
  };

  if (loading) return <div className="text-center py-8">Loading archive...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Archived Tasks</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search tasks..."
            className="pl-10 pr-4 py-2 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4 text-gray-500" />
            <SelectValue placeholder="Filter by Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(categories as TaskCategory[]).map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4 text-gray-500" />
            <SelectValue placeholder="Filter by Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredArchivedTasks.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No archived tasks found matching your criteria.</p>
        ) : (
          filteredArchivedTasks.filter(task => task.parent_task_id === null).map(task => (
            <TaskItem
              key={task.id}
              task={task as Task}
              categories={categories as TaskCategory[]}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onAddSubtask={async (description, parentTaskId) => { await addTask(description, null, parentTaskId); }}
              onToggleFocusMode={async () => {}}
              onLogDoTodayOff={async () => {}}
              isFocusedTask={false}
              subtasks={allTasks.filter(sub => sub.parent_task_id === task.id) as Task[]}
              renderSubtasks={renderSubtasks}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Archive;