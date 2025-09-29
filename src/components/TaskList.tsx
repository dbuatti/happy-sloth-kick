import React, { useState, useCallback, useMemo } from 'react';
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, ChevronRight, Settings, EyeOff, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import QuickAddTask from './QuickAddTask';
import TaskItem from './TaskItem';
import { cn } from '@/lib/utils';

interface TaskListProps {
  processedTasks: Task[];
  filteredTasks: Task[];
  loading: boolean;
  handleAddTask: (taskData: NewTaskData) => Promise<any>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<any>;
  deleteTask: (id: string) => Promise<any>;
  markAllTasksInSectionCompleted: (sectionId: string) => Promise<any>;
  sections: TaskSection[];
  createSection: (name: string) => Promise<any>;
  updateSection: (id: string, newName: string) => Promise<void>;
  deleteSection: (id: string) => Promise<any>;
  updateSectionIncludeInFocusMode: (id: string, include: boolean) => Promise<any>;
  allCategories: Category[];
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  expandedSections: Record<string, boolean>;
  expandedTasks: Record<string, boolean>;
  toggleTask: (taskId: string) => void;
  toggleSection: (sectionId: string) => void;
  setFocusTask: (taskId: string | null) => Promise<void>;
  doTodayOffIds: Set<string>;
  toggleDoToday: (task: Task) => Promise<void>;
  scheduledTasksMap: Map<string, any>;
  isDemo?: boolean;
  selectedTaskIds: Set<string>;
  onSelectTask: (taskId: string, isSelected: boolean) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  processedTasks,
  filteredTasks,
  loading,
  handleAddTask,
  updateTask,
  deleteTask,
  markAllTasksInSectionCompleted,
  sections,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  allCategories,
  onOpenOverview,
  currentDate,
  expandedSections,
  expandedTasks,
  toggleTask,
  toggleSection,
  setFocusTask,
  doTodayOffIds,
  toggleDoToday,
  scheduledTasksMap,
  isDemo = false,
  selectedTaskIds,
  onSelectTask,
}) => {
  const [newSectionName, setNewSectionName] = useState('');
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState('');
  const [isConfirmDeleteSectionOpen, setIsConfirmDeleteSectionOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<TaskSection | null>(null);

  const sectionIds = useMemo(() => new Set(sections.map(s => s.id)), [sections]);
  const tasksWithoutSection = filteredTasks.filter(task => !task.section_id || !sectionIds.has(task.section_id));

  const getTasksForSection = useCallback((sectionId: string) => {
    return filteredTasks.filter(task => task.section_id === sectionId);
  }, [filteredTasks]);

  const handleCreateSection = useCallback(async () => {
    if (newSectionName.trim()) {
      setIsCreatingSection(true);
      await createSection(newSectionName.trim());
      setNewSectionName('');
      setIsCreatingSection(false);
    }
  }, [newSectionName, createSection]);

  const handleEditSection = useCallback((section: TaskSection) => {
    setEditSectionId(section.id);
    setEditSectionName(section.name);
  }, []);

  const handleUpdateSection = useCallback(async () => {
    if (editSectionId && editSectionName.trim()) {
      await updateSection(editSectionId, editSectionName.trim());
      setEditSectionId(null);
      setEditSectionName('');
    }
  }, [editSectionId, editSectionName, updateSection]);

  const handleDeleteSection = useCallback(async () => {
    if (sectionToDelete) {
      await deleteSection(sectionToDelete.id);
      setIsConfirmDeleteSectionOpen(false);
      setSectionToDelete(null);
    }
  }, [sectionToDelete, deleteSection]);

  const confirmDeleteSection = useCallback((section: TaskSection) => {
    setSectionToDelete(section);
    setIsConfirmDeleteSectionOpen(true);
  }, []);

  const renderTask = useCallback((task: Task) => {
    const isDoToday = !doTodayOffIds.has(task.original_task_id || task.id);
    return (
      <TaskItem
        key={task.id}
        task={task}
        onUpdate={updateTask}
        onDelete={deleteTask}
        onOpenOverview={onOpenOverview}
        isExpanded={expandedTasks[task.id] === true}
        toggleExpand={toggleTask}
        setFocusTask={setFocusTask}
        toggleDoToday={toggleDoToday}
        scheduledAppointment={scheduledTasksMap.get(task.id)}
        isDemo={isDemo}
        isSelected={selectedTaskIds.has(task.id)}
        onSelectTask={onSelectTask}
        allTasks={processedTasks}
        sections={sections}
        currentDate={currentDate}
        level={0}
        isDoToday={isDoToday}
      />
    );
  }, [updateTask, deleteTask, onOpenOverview, expandedTasks, toggleTask, setFocusTask, toggleDoToday, scheduledTasksMap, isDemo, selectedTaskIds, onSelectTask, processedTasks, sections, currentDate, doTodayOffIds]);

  const renderSectionHeader = useCallback((section: TaskSection, tasksInThisSection: Task[]) => (
    <div className="flex items-center justify-between py-2 px-3 bg-secondary/50 rounded-t-lg border-b border-border">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => toggleSection(section.id)}
          className="h-7 w-7"
        >
          {expandedSections[section.id] === false ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        {editSectionId === section.id ? (
          <Input
            value={editSectionName}
            onChange={(e) => setEditSectionName(e.target.value)}
            onBlur={handleUpdateSection}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className="h-7 text-sm font-semibold"
            autoFocus
          />
        ) : (
          <h3 className="text-sm font-semibold text-foreground cursor-pointer" onClick={() => toggleSection(section.id)}>
            {section.name} ({tasksInThisSection.length})
          </h3>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => handleEditSection(section)}>Rename Section</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => markAllTasksInSectionCompleted(section.id)}>Mark All Completed</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => updateSectionIncludeInFocusMode(section.id, !section.include_in_focus_mode)}>
            {section.include_in_focus_mode ? (
              <span className="flex items-center"><EyeOff className="mr-2 h-4 w-4" /> Exclude from Focus Mode</span>
            ) : (
              <span className="flex items-center"><Eye className="mr-2 h-4 w-4" /> Include in Focus Mode</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onSelect={() => confirmDeleteSection(section)}>Delete Section</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ), [expandedSections, editSectionId, editSectionName, toggleSection, handleUpdateSection, markAllTasksInSectionCompleted, updateSectionIncludeInFocusMode, confirmDeleteSection, handleEditSection]);


  // Calculate these values directly
  const hasFiltersApplied = filteredTasks.length === 0 && processedTasks.length > 0;
  const showNoTasksMessage = filteredTasks.length === 0 && !loading && !hasFiltersApplied;

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      {showNoTasksMessage && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-semibold mb-2">No tasks for today!</p>
          <p className="mb-4">Time to relax or add some new tasks.</p>
        </div>
      )}

      {filteredTasks.length === 0 && !loading && hasFiltersApplied && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-semibold mb-2">No tasks match your current filters.</p>
          <p className="mb-4">Try adjusting your filters or clearing them.</p>
        </div>
      )}

      {/* Global Quick Add Task component - always rendered once */}
      <QuickAddTask
        onAddTask={handleAddTask}
        defaultCategoryId={allCategories[0]?.id || ''}
        isDemo={isDemo}
        allCategories={allCategories}
        currentDate={currentDate}
        sections={sections} // Pass sections for the selector
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
      />

      {/* "No Section" block */}
      <div className={cn("border rounded-lg bg-card shadow-sm", tasksWithoutSection.length === 0 && !isDemo && "hidden")}>
        {renderSectionHeader({ id: 'no-section', name: 'No Section', order: -1, include_in_focus_mode: true, user_id: 'synthetic' }, tasksWithoutSection)}
        <div className="p-3 space-y-2">
          {expandedSections['no-section'] !== false && (
            tasksWithoutSection.map((task) => renderTask(task))
          )}
        </div>
      </div>

      {/* Mapped sections */}
      {sections.map(section => {
        const tasksInThisSection = getTasksForSection(section.id);
        const showSectionContent = tasksInThisSection.length > 0 || isDemo;

        return (
          <div key={section.id} className={cn("border rounded-lg bg-card shadow-sm", !showSectionContent && "hidden")}>
            {renderSectionHeader(section, tasksInThisSection)}
            <div className="p-3 space-y-2">
              {expandedSections[section.id] !== false && (
                tasksInThisSection.map((task) => renderTask(task))
              )}
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-2 mt-4 p-2 border rounded-lg bg-background shadow-sm">
        <Input
          type="text"
          placeholder="New section name"
          value={newSectionName}
          onChange={(e) => setNewSectionName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateSection()}
          disabled={isCreatingSection || isDemo}
          className="flex-1 h-9 text-base"
        />
        <Button onClick={handleCreateSection} disabled={isCreatingSection || !newSectionName.trim() || isDemo} className="h-9 px-4">
          {isCreatingSection ? 'Creating...' : <Plus className="h-4 w-4" />} Add Section
        </Button>
      </div>

      <Dialog open={isConfirmDeleteSectionOpen} onOpenChange={setIsConfirmDeleteSectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete Section</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the section "{sectionToDelete?.name}"? All tasks within this section will be moved to "No Section". This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDeleteSectionOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteSection}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskList;