import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Task, useTasks, UpdateTaskData, NewTaskSectionData, UpdateTaskSectionData, Category, NewCategoryData, UpdateCategoryData } from '@/hooks/useTasks';
import TaskItem from '@/components/TaskItem';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDoToday } from '@/hooks/useDoToday'; // Import useDoToday
import { parseISO } from 'date-fns'; // Removed format, isSameDay as they are not directly used here

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ demoUserId }) => { // Removed isDemo as it's unused
  const {
    tasks, // All tasks (real and generated recurring)
    isLoading: tasksLoading,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useTasks({ userId: demoUserId, currentDate: new Date() });

  const { doTodayOffIds, toggleDoToday } = useDoToday({ userId: demoUserId, currentDate: new Date() });

  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string | null>(null);

  const archivedTasks = useMemo(() => {
    return tasks.filter(task => task.status === 'archived')
      .filter(task =>
        task.description.toLowerCase().includes(searchFilter.toLowerCase()) &&
        (categoryFilter ? task.category === categoryFilter : true) &&
        (priorityFilter ? task.priority === priorityFilter : true) &&
        (sectionFilter ? task.section_id === sectionFilter : true)
      )
      .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime()); // Sort by creation date descending
  }, [tasks, searchFilter, categoryFilter, priorityFilter, sectionFilter]);

  const handleTaskStatusChange = async (taskId: string, newStatus: Task['status']) => {
    const updatedTask = await updateTask(taskId, { status: newStatus });
    return updatedTask;
  };

  const handleOpenOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setTaskToOverview(null); // Close overview
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col p-4">
      <main className="flex-grow">
        <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-xl p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center">Archived Tasks</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="mb-4 space-y-2">
              <Input
                placeholder="Search archived tasks..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Select onValueChange={setCategoryFilter} value={categoryFilter || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {allCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={setPriorityFilter} value={priorityFilter || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select onValueChange={setSectionFilter} value={sectionFilter || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Sections</SelectItem>
                    <SelectItem value="no-section">No Section</SelectItem>
                    {sections.map(section => (
                      <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {tasksLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {archivedTasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No archived tasks found.</p>
                ) : (
                  <ul className="space-y-2">
                    {archivedTasks.map((task) => (
                      <li key={task.id} className="relative rounded-xl p-2 transition-all duration-200 ease-in-out group hover:shadow-md">
                        <TaskItem
                          task={task}
                          onStatusChange={handleTaskStatusChange}
                          onDelete={deleteTask}
                          onUpdate={updateTask}
                          onOpenOverview={handleOpenOverview}
                          sections={sections}
                          allCategories={allCategories}
                          isDraggable={false} // Archived tasks are not draggable
                          doTodayOffIds={doTodayOffIds}
                          toggleDoToday={toggleDoToday}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="p-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TaskMaster. All rights reserved.</p>
      </footer>

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={tasks} // Pass all tasks for subtask filtering
        />
      )}

      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          createCategory={createCategory}
          updateCategory={updateCategory}
          deleteCategory={deleteCategory}
          allTasks={tasks} // Pass all tasks for subtask selection
        />
      )}
    </div>
  );
};

export default Archive;