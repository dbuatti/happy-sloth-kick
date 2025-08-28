import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { CalendarDays, PlusCircle, ListTodo, LayoutGrid, Settings, Star, FolderOpen, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { format, isSameDay, isPast, parseISO } from 'date-fns';
import { useTasks } from '@/hooks/useTasks'; // Import Task and TaskSection from useTasks
import { Task, TaskSection, TaskStatus } from '@/types/task-management'; // Import TaskStatus from types
import TaskItem from '@/components/tasks/TaskItem';
import TaskForm from '@/components/tasks/TaskForm';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import SectionForm from '@/components/SectionForm';
import CategoryForm from '@/components/CategoryForm';
import { DragDropContext, Droppable, Draggable, DropResult } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { useSettings } from '@/context/SettingsContext';

interface IndexPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const IndexPage: React.FC<IndexPageProps> = ({ isDemo = false, demoUserId }) => {
  const { settings } = useSettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('today');

  const {
    tasks: allTasks,
    sections,
    categories: allCategories,
    addTask,
    updateTask,
    deleteTask,
    createSection,
    updateSection,
    deleteSection,
    updateSectionOrder,
    updateSectionIncludeInFocusMode,
    createCategory,
    updateCategory,
    deleteCategory,
    loading,
    error,
  } = useTasks({ currentDate, userId: demoUserId });

  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);

  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

  const [isSectionFormOpen, setIsSectionFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<TaskSection | null>(null);

  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null); // Use 'any' or define Category type

  const todayTasks = useMemo(() => {
    return allTasks.filter(task =>
      task.is_all_day &&
      task.status === 'to-do' &&
      task.due_date &&
      isSameDay(parseISO(task.due_date), currentDate)
    ).sort((a, b) => (a.priority === 'urgent' ? -1 : b.priority === 'urgent' ? 1 : 0));
  }, [allTasks, currentDate]);

  const upcomingTasks = useMemo(() => {
    return allTasks.filter(task =>
      task.status === 'to-do' &&
      task.due_date &&
      !isSameDay(parseISO(task.due_date), currentDate) &&
      !isPast(parseISO(task.due_date))
    ).sort((a, b) => {
      const dateA = parseISO(a.due_date!);
      const dateB = parseISO(b.due_date!);
      return dateA.getTime() - dateB.getTime();
    });
  }, [allTasks, currentDate]);

  const inboxTasks = useMemo(() => {
    return allTasks.filter(task =>
      task.status === 'to-do' &&
      !task.due_date &&
      !task.section_id
    );
  }, [allTasks]);

  const completedTasks = useMemo(() => {
    return allTasks.filter(task => task.status === 'completed');
  }, [allTasks]);

  const focusModeTasks = useMemo(() => {
    if (!settings?.focus_mode_enabled) return [];

    const focusModeSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));

    return allTasks.filter(task =>
      task.status === 'to-do' &&
      (task.section_id === null || focusModeSectionIds.has(task.section_id))
    ).sort((a, b) => (a.priority === 'urgent' ? -1 : b.priority === 'urgent' ? 1 : 0));
  }, [allTasks, sections, settings?.focus_mode_enabled]);

  const handleOpenTaskForm = (task: Task | null = null) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  };

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleOpenTaskDetail = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => { // Added TaskStatus type
    await updateTask(taskId, { status: newStatus });
  };

  const handleOpenSectionForm = (section: TaskSection | null = null) => {
    setEditingSection(section);
    setIsSectionFormOpen(true);
  };

  const handleOpenCategoryForm = (category: any | null = null) => { // Use 'any' or define Category type
    setEditingCategory(category);
    setIsCategoryFormOpen(true);
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const sourceSectionId = source.droppableId === 'inbox' ? null : source.droppableId;
    const destinationSectionId = destination.droppableId === 'inbox' ? null : destination.droppableId;

    const draggedTask = allTasks.find(task => task.id === draggableId);
    if (!draggedTask) return;

    // If moving within the same section
    if (sourceSectionId === destinationSectionId) {
      // For now, we don't support reordering within sections, only between them.
      // A more complex implementation would involve updating 'order' fields for tasks.
      return;
    }

    // If moving to a different section
    updateTask(draggedTask.id, { section_id: destinationSectionId });
    toast.success(`Task moved to ${destination.droppableId === 'inbox' ? 'Inbox' : sections.find(s => s.id === destinationSectionId)?.name || 'a section'}.`);
  };

  const onSectionDragEnd = (result: DropResult) => {
    const { destination, source } = result;

    if (!destination) {
      return;
    }

    if (destination.index === source.index) {
      return;
    }

    const newSectionsOrder = arrayMove(sections, source.index, destination.index);
    updateSectionOrder(newSectionsOrder);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-destructive">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center items-center">
        <Card className="w-full max-w-6xl mx-auto shadow-lg rounded-xl p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <ListTodo className="h-7 w-7" /> Task Management
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex justify-between items-center mb-4">
              <Button onClick={() => handleOpenTaskForm()} disabled={isDemo}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Task
              </Button>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" disabled={isDemo}>
                      <LayoutGrid className="mr-2 h-4 w-4" /> Manage Sections
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0">
                    <Command>
                      <CommandInput placeholder="Search sections..." />
                      <CommandList>
                        <CommandEmpty>No sections found.</CommandEmpty>
                        <CommandGroup>
                          <Droppable droppableId="sections-list" type="SECTION">
                            {(provided) => (
                              <div {...provided.droppableProps} ref={provided.innerRef}>
                                {sections.map((section, index) => (
                                  <Draggable key={section.id} draggableId={section.id} index={index}>
                                    {(provided) => (
                                      <CommandItem
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="flex items-center justify-between"
                                      >
                                        <span className="flex-1">{section.name}</span>
                                        <div className="flex items-center gap-1">
                                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenSectionForm(section); }}>Edit</Button>
                                          <input
                                            type="checkbox"
                                            checked={section.include_in_focus_mode}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              updateSectionIncludeInFocusMode(section.id, e.target.checked);
                                            }}
                                            className="ml-2"
                                            title="Include in Focus Mode"
                                          />
                                        </div>
                                      </CommandItem>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                    <Button variant="ghost" className="w-full justify-start mt-2" onClick={() => handleOpenSectionForm()}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add New Section
                    </Button>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" disabled={isDemo}>
                      <Settings className="mr-2 h-4 w-4" /> Manage Categories
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0">
                    <Command>
                      <CommandInput placeholder="Search categories..." />
                      <CommandList>
                        <CommandEmpty>No categories found.</CommandEmpty>
                        <CommandGroup>
                          {allCategories.map((category) => (
                            <CommandItem key={category.id} className="flex items-center justify-between">
                              <span className="flex-1 flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color || '#ccc' }} />
                                {category.name}
                              </span>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenCategoryForm(category); }}>Edit</Button>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                    <Button variant="ghost" className="w-full justify-start mt-2" onClick={() => handleOpenCategoryForm()}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
                    </Button>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="inbox">Inbox</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              <TabsContent value="today" className="mt-4">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" /> Tasks Due Today ({format(currentDate, 'PPP')})
                </h3>
                <div className="space-y-3">
                  {todayTasks.length > 0 ? (
                    todayTasks.map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onToggleComplete={handleUpdateTaskStatus}
                        onOpenOverview={handleOpenTaskOverview}
                        onOpenEdit={handleOpenTaskDetail}
                        onDelete={deleteTask}
                        sections={sections}
                      />
                    ))
                  ) : (
                    <p className="text-muted-foreground">No tasks due today. Enjoy your clear schedule!</p>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="upcoming" className="mt-4">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" /> Upcoming Tasks
                </h3>
                <div className="space-y-3">
                  {upcomingTasks.length > 0 ? (
                    upcomingTasks.map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onToggleComplete={handleUpdateTaskStatus}
                        onOpenOverview={handleOpenTaskOverview}
                        onOpenEdit={handleOpenTaskDetail}
                        onDelete={deleteTask}
                        sections={sections}
                      />
                    ))
                  ) : (
                    <p className="text-muted-foreground">No upcoming tasks. Time to plan ahead!</p>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="inbox" className="mt-4">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" /> Inbox & Uncategorized
                </h3>
                <DragDropContext onDragEnd={onDragEnd}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Droppable droppableId="inbox" type="TASK">
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="bg-muted/40 p-4 rounded-lg min-h-[150px] flex flex-col gap-3"
                        >
                          <h4 className="font-semibold text-lg mb-2">Inbox</h4>
                          {inboxTasks.length > 0 ? (
                            inboxTasks.map((task, index) => (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                  >
                                    <TaskItem
                                      task={task}
                                      onToggleComplete={handleUpdateTaskStatus}
                                      onOpenOverview={handleOpenTaskOverview}
                                      onOpenEdit={handleOpenTaskDetail}
                                      onDelete={deleteTask}
                                      sections={sections}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No tasks in inbox.</p>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

                    {sections.map(section => (
                      <Droppable key={section.id} droppableId={section.id} type="TASK">
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="bg-muted/40 p-4 rounded-lg min-h-[150px] flex flex-col gap-3"
                          >
                            <h4 className="font-semibold text-lg mb-2 flex items-center justify-between">
                              <span>{section.name}</span>
                              <input
                                type="checkbox"
                                checked={section.include_in_focus_mode}
                                onChange={(e) => updateSectionIncludeInFocusMode(section.id, e.target.checked)}
                                className="ml-2"
                                title="Include in Focus Mode"
                              />
                            </h4>
                            {allTasks.filter(task => task.section_id === section.id && task.status === 'to-do').length > 0 ? (
                              allTasks.filter(task => task.section_id === section.id && task.status === 'to-do').map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                    >
                                      <TaskItem
                                        task={task}
                                        onToggleComplete={handleUpdateTaskStatus}
                                        onOpenOverview={handleOpenTaskOverview}
                                        onOpenEdit={handleOpenTaskDetail}
                                        onDelete={deleteTask}
                                        sections={sections}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No tasks in this section.</p>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    ))}
                  </div>
                </DragDropContext>
              </TabsContent>
              <TabsContent value="completed" className="mt-4">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" /> Completed Tasks
                </h3>
                <div className="space-y-3">
                  {completedTasks.length > 0 ? (
                    completedTasks.map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onToggleComplete={handleUpdateTaskStatus}
                        onOpenOverview={handleOpenTaskOverview}
                        onOpenEdit={handleOpenTaskDetail}
                        onDelete={deleteTask}
                        sections={sections}
                      />
                    ))
                  ) : (
                    <p className="text-muted-foreground">No completed tasks yet. Get to work!</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {settings?.focus_mode_enabled && (
              <>
                <Separator className="my-6" />
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Circle className="h-5 w-5 text-yellow-500" /> Focus Mode Tasks
                </h3>
                <div className="space-y-3">
                  {focusModeTasks.length > 0 ? (
                    focusModeTasks.map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onToggleComplete={handleUpdateTaskStatus}
                        onOpenOverview={handleOpenTaskOverview}
                        onOpenEdit={handleOpenTaskDetail}
                        onDelete={deleteTask}
                        sections={sections}
                      />
                    ))
                  ) : (
                    <p className="text-muted-foreground">No tasks in focus mode. Add some tasks to your focus sections!</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="p-4">
        <p>&copy; {new Date().getFullYear()} TaskMaster. All rights reserved.</p>
      </footer>

      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
        onSave={addTask}
        initialData={editingTask}
        sections={sections}
        allCategories={allCategories}
        onCreateCategory={createCategory}
      />
      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleOpenTaskDetail}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={allTasks as Task[]}
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
          allTasks={allTasks as Task[]}
        />
      )}
      <SectionForm
        isOpen={isSectionFormOpen}
        onClose={() => setIsSectionFormOpen(false)}
        onSave={editingSection ? updateSection : createSection}
        initialData={editingSection}
        onDelete={deleteSection}
      />
      <CategoryForm
        isOpen={isCategoryFormOpen}
        onClose={() => setIsCategoryFormOpen(false)}
        onSave={editingCategory ? updateCategory : createCategory}
        initialData={editingCategory}
        onDelete={deleteCategory}
      />
    </div>
  );
};

export default IndexPage;