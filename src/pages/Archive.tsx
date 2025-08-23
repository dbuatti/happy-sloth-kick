import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { Task, TaskCategory, TaskSection } from '@/types';
import TaskItem from '@/components/TaskItem';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const {
    tasks: allTasks,
    sections,
    categories,
    loading,
    error,
    updateTask,
    deleteTask,
    addTask, // Assuming addTask is available from useTasks
  } = useTasks(currentUserId);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<Task['status'] | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string | 'all'>('all');

  const archivedTasks = allTasks.filter(task => task.status === 'completed');

  const filteredArchivedTasks = archivedTasks.filter(task => {
    const matchesSearch = task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || task.category === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (loading) return <div className="p-4 text-center">Loading archive...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;

  const renderSubtasks = (parentTaskId: string) => {
    return allTasks
      .filter(sub => sub.parent_task_id === parentTaskId)
      .map(subtask => (
        <TaskItem
          key={subtask.id}
          task={subtask as Task}
          categories={categories}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onAddSubtask={async (description, parentTaskId) => { await addTask(description, null, parentTaskId); }}
          onToggleFocusMode={() => {}}
          onLogDoTodayOff={() => {}}
          isFocusedTask={false}
          subtasks={[]} // Recursion handled by renderSubtasks in TaskItem
          renderSubtasks={() => null}
          isDragging={false}
          onDragStart={() => {}}
        />
      ));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Archived Tasks</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search archived tasks..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={(value: Task['status'] | 'all') => setFilterStatus(value)}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="to-do">To-Do</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={(value: string | 'all') => setFilterCategory(value)}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredArchivedTasks.length === 0 ? (
          <p className="text-center text-gray-500">No archived tasks found matching your criteria.</p>
        ) : (
          filteredArchivedTasks
            .filter(task => !task.parent_task_id) // Only show top-level tasks
            .map(task => (
              <TaskItem
                key={task.id}
                task={task}
                categories={categories}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                onAddSubtask={async (description, parentTaskId) => { await addTask(description, null, parentTaskId); }}
                onToggleFocusMode={() => {}}
                onLogDoTodayOff={() => {}}
                isFocusedTask={false}
                subtasks={allTasks.filter(sub => sub.parent_task_id === task.id)}
                renderSubtasks={renderSubtasks}
                isDragging={false}
                onDragStart={() => {}}
              />
            ))
        )}
      </div>
    </div>
  );
};

export default Archive;