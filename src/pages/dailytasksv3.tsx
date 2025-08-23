import React, { useState, useMemo, useCallback } from 'react';
import { format, isToday, isPast, parseISO, startOfWeek, addDays, isSameDay } from 'date-fns';
import {
  Calendar as CalendarIcon, Plus, GripVertical, Edit, Trash2, ChevronLeft, ChevronRight,
  List, CalendarDays, Info, Star, Search, Filter, Settings, ListTodo, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// Re-importing types from the new types file
import { Task, TaskSection, TaskCategory, TaskPriority } from '@/types/task-management';

// Re-importing refactored components
import TaskForm from '@/components/tasks/TaskForm';
import SectionForm from '@/components/tasks/SectionForm';
import CategoryForm from '@/components/tasks/CategoryForm';
import TaskItem from '@/components/tasks/TaskItem';

// Re-importing the custom hook
import { useTaskManagement } from '@/hooks/useTaskManagement';

const DailyTasksV3: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isAddSectionDialogOpen, setIsAddSectionDialogOpen] = useState(false);
  const [isManageCategoriesDialogOpen, setIsManageCategoriesDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<TaskSection | null>(null);
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string | 'all'>('all');

  const {
    sections,
    isLoadingSections,
    sectionsError,
    categories,
    isLoadingCategories,
    categoriesError,
    addTask,
    updateTask,
    deleteTask,
    updateTaskOrders,
    addSection,
    updateSection,
    deleteSection,
    updateSectionOrders,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useTaskManagement();

  const handleAddTask = (newTask: Partial<Task>) => {
    addTask(newTask);
    setIsAddTaskDialogOpen(false); // Close dialog after adding
  };

  const handleUpdateTask = (updatedTask: Partial<Task>) => {
    updateTask(updatedTask);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
  };

  const handleAddSection = (newSection: Partial<TaskSection>) => {
    addSection(newSection);
    setIsAddSectionDialogOpen(false); // Close dialog after adding
  };

  const handleUpdateSection = (updatedSection: Partial<TaskSection>) => {
    updateSection(updatedSection);
    setEditingSection(null); // Close dialog after updating
  };

  const handleDeleteSection = (sectionId: string) => {
    deleteSection(sectionId);
  };

  const handleAddCategory = (newCategory: Partial<TaskCategory>) => {
    addCategory(newCategory);
  };

  const handleUpdateCategory = (updatedCategory: Partial<TaskCategory>) => {
    updateCategory(updatedCategory);
    setEditingCategory(null); // Close dialog after updating
  };

  const handleDeleteCategory = (categoryId: string) => {
    deleteCategory(categoryId);
  };

  const filteredSections = useMemo(() => {
    if (!sections) return [];

    return sections
      .map((section) => {
        const filteredTasks = section.tasks
          .filter((task) => {
            const matchesSearch = task.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
            const matchesCategory = filterCategory === 'all' || task.category === filterCategory;

            // Filter by date: only show tasks due on or before the current date, or tasks without a due date
            const taskDueDate = task.due_date ? parseISO(task.due_date) : null;
            const isRelevantDate =
              !taskDueDate ||
              isSameDay(taskDueDate, currentDate) ||
              (isPast(taskDueDate) && !isSameDay(taskDueDate, currentDate) && task.status !== 'completed');

            return matchesSearch && matchesPriority && matchesCategory && isRelevantDate;
          })
          .sort((a, b) => a.order - b.order); // Ensure tasks within sections are sorted

        return { ...section, tasks: filteredTasks };
      })
      .filter((section) => section.tasks.length > 0 || searchTerm || filterPriority !== 'all' || filterCategory !== 'all');
  }, [sections, searchTerm, filterPriority, filterCategory, currentDate]);

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, type } = result;

      if (!destination) {
        return;
      }

      if (destination.droppableId === source.droppableId && destination.index === source.index) {
        return;
      }

      if (type === 'section') {
        const newSections = Array.from(sections);
        const [movedSection] = newSections.splice(source.index, 1);
        newSections.splice(destination.index, 0, movedSection);

        const updates = newSections.map((section, index) => ({
          id: section.id,
          order: index,
          name: section.name,
          include_in_focus_mode: section.include_in_focus_mode,
        }));
        await updateSectionOrders(updates);
      } else if (type === 'task') {
        const sourceSectionId = source.droppableId;
        const destinationSectionId = destination.droppableId;

        const newSections = JSON.parse(JSON.stringify(sections)); // Deep copy to avoid direct state mutation
        const sourceSection = newSections.find((sec: TaskSection) => sec.id === sourceSectionId);
        const destinationSection = newSections.find((sec: TaskSection) => sec.id === destinationSectionId);

        if (!sourceSection || !destinationSection) return;

        let movedTask: Task;

        // Remove from source
        const [removed] = sourceSection.tasks.splice(source.index, 1);
        movedTask = removed;

        // Add to destination
        destinationSection.tasks.splice(destination.index, 0, movedTask);

        // Update orders and section_ids
        const taskUpdates: { id: string; order: number; section_id: string | null; parent_task_id: string | null }[] = [];

        sourceSection.tasks.forEach((task: Task, index: number) => {
          if (task.order !== index || task.section_id !== sourceSection.id) {
            taskUpdates.push({ id: task.id, order: index, section_id: sourceSection.id, parent_task_id: task.parent_task_id });
          }
        });

        destinationSection.tasks.forEach((task: Task, index: number) => {
          if (task.order !== index || task.section_id !== destinationSection.id) {
            taskUpdates.push({ id: task.id, order: index, section_id: destinationSection.id, parent_task_id: task.parent_task_id });
          }
        });

        if (taskUpdates.length > 0) {
          await updateTaskOrders(taskUpdates);
        }
      }
    },
    [sections, updateSectionOrders, updateTaskOrders]
  );

  if (isLoadingSections || isLoadingCategories) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="ml-2 text-gray-600">Loading tasks...</p>
      </div>
    );
  }

  if (sectionsError || categoriesError) {
    return (
      <div className="text-center p-4 text-red-600">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <p>Error loading data: {sectionsError?.message || categoriesError?.message}</p>
      </div>
    );
  }

  const daysOfWeek = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDate]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <ListTodo className="mr-3 h-8 w-8 text-blue-600" /> Daily Tasks
        </h1>

        {/* Date Navigation */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm mb-6">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex space-x-2">
            {daysOfWeek.map((day) => (
              <Button
                key={day.toISOString()}
                variant={isSameDay(day, currentDate) ? 'default' : 'outline'}
                onClick={() => setCurrentDate(day)}
                className="flex flex-col h-auto w-16 py-2"
              >
                <span className="text-xs font-medium">{format(day, 'EEE')}</span>
                <span className="text-lg font-bold">{format(day, 'd')}</span>
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="relative flex-grow max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterPriority} onValueChange={(value: TaskPriority | 'all') => setFilterPriority(value)}>
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
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={(value: string | 'all') => setFilterCategory(value)}>
            <SelectTrigger className="w-[180px]">
              <Tag className="mr-2 h-4 w-4 text-gray-500" />
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-shrink-0">
                <Plus className="mr-2 h-4 w-4" /> Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <TaskForm onSave={handleAddTask} onClose={() => setIsAddTaskDialogOpen(false)} categories={categories} sections={sections} />
            </DialogContent>
          </Dialog>

          <Dialog open={isAddSectionDialogOpen} onOpenChange={setIsAddSectionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-shrink-0">
                <List className="mr-2 h-4 w-4" /> Add Section
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Section</DialogTitle>
              </DialogHeader>
              <SectionForm onSave={handleAddSection} onClose={() => setIsAddSectionDialogOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={isManageCategoriesDialogOpen} onOpenChange={setIsManageCategoriesDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-shrink-0">
                <Settings className="mr-2 h-4 w-4" /> Manage Categories
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Manage Categories</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 p-4">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-2 border rounded-md">
                    <span className="font-medium" style={{ color: category.color }}>
                      {category.name}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Dialog open={editingCategory?.id === category.id} onOpenChange={(open) => !open && setEditingCategory(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingCategory(category)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Edit Category</DialogTitle>
                          </DialogHeader>
                          <CategoryForm
                            initialCategory={editingCategory}
                            onSave={handleUpdateCategory}
                            onClose={() => setEditingCategory(null)}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDeleteCategory(category.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Plus className="mr-2 h-4 w-4" /> Add New Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add New Category</DialogTitle>
                    </DialogHeader>
                    <CategoryForm onSave={handleAddCategory} onClose={() => {}} />
                  </DialogContent>
                </Dialog>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="sections" type="section">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                {filteredSections.length === 0 && (
                  <div className="text-center text-gray-500 p-8 bg-white rounded-lg shadow-sm">
                    <ListTodo className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No tasks found for this day or filters.</p>
                    <p className="text-sm">Try adjusting your date or filters, or add a new task!</p>
                  </div>
                )}
                {filteredSections.map((section, sectionIndex) => (
                  <Draggable key={section.id} draggableId={section.id} index={sectionIndex}>
                    {(providedSection) => (
                      <div
                        ref={providedSection.innerRef}
                        {...providedSection.draggableProps}
                        className="bg-white rounded-lg shadow-md p-4"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <span {...providedSection.dragHandleProps} className="mr-3 text-gray-400 cursor-grab">
                              <GripVertical className="h-5 w-5" />
                            </span>
                            <h2 className="text-xl font-semibold text-gray-800">{section.name}</h2>
                            {section.include_in_focus_mode && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Star className="ml-2 h-4 w-4 text-yellow-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Included in Focus Mode</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Dialog open={editingSection?.id === section.id} onOpenChange={(open) => !open && setEditingSection(null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingSection(section)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Edit Section</DialogTitle>
                                </DialogHeader>
                                <SectionForm
                                  initialSection={editingSection}
                                  onSave={handleUpdateSection}
                                  onClose={() => setEditingSection(null)}
                                />
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDeleteSection(section.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <Droppable droppableId={section.id} type="task">
                          {(providedTask) => (
                            <div {...providedTask.droppableProps} ref={providedTask.innerRef} className="min-h-[50px]">
                              {section.tasks.map((task, taskIndex) => (
                                <TaskItem
                                  key={task.id}
                                  task={task}
                                  index={taskIndex}
                                  categories={categories}
                                  sections={sections}
                                  onUpdateTask={handleUpdateTask}
                                  onDeleteTask={handleDeleteTask}
                                  onAddTask={handleAddTask}
                                />
                              ))}
                              {providedTask.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
};

export default DailyTasksV3;