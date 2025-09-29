// Removed 'declare module 'react-beautiful-dnd';' - this should be in a global .d.ts file or handled by @types.

import React, { useState, useCallback, useMemo } from 'react';
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
// Removed import type { DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, ChevronRight, Settings, EyeOff, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import QuickAddTask from './QuickAddTask';
import TaskItem from './TaskItem'; // Ensure TaskItem is imported

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
  updateSection: (id: string, newName: string) => Promise<void>; // Corrected type to match useTasks
  deleteSection: (id: string) => Promise<any>;
  updateSectionIncludeInFocusMode: (id: string, include: boolean) => Promise<any>;
  // Removed updateTaskParentAndOrder as it's not used in current TaskList implementation
  // Removed reorderSections as it's not used in current TaskList implementation
  allCategories: Category[];
  // Removed setIsAddTaskOpen as it's not used in current TaskList implementation
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  expandedSections: Record<string, boolean>;
  expandedTasks: Record<string, boolean>;
  toggleTask: (taskId: string) => void;
  toggleSection: (sectionId: string) => void;
  // Removed toggleAllSections as it's not used in current TaskList implementation
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
  // Removed updateTaskParentAndOrder
  // Removed reorderSections
  allCategories,
  // Removed setIsAddTaskOpen
  onOpenOverview,
  currentDate,
  expandedSections,
  expandedTasks,
  toggleTask,
  toggleSection,
  // Removed toggleAllSections
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

  const tasksWithoutSection = useMemo(() => {
    const sectionIds = new Set(sections.map(s => s.id));
    return filteredTasks.filter(task => !task.section_id || !sectionIds.has(task.section_id));
  }, [filteredTasks, sections]);

  const getTasksForSection = useCallback((sectionId: string) => {
    return filteredTasks.filter(task => task.section_id === sectionId);
  }, [filteredTasks]);

  const handleCreateSection = async () => {
    if (newSectionName.trim()) {
      setIsCreatingSection(true);
      await createSection(newSectionName.trim());
      setNewSectionName('');
      setIsCreatingSection(false);
    }
  };

  const handleEditSection = (section: TaskSection) => {
    setEditSectionId(section.id);
    setEditSectionName(section.name);
  };

  const handleUpdateSection = async () => {
    if (editSectionId && editSectionName.trim()) {
      await updateSection(editSectionId, editSectionName.trim()); // Corrected call to match useTasks signature
      setEditSectionId(null);
      setEditSectionName('');
    }
  };

  const handleDeleteSection = async () => {
    if (sectionToDelete) {
      await deleteSection(sectionToDelete.id);
      setIsConfirmDeleteSectionOpen(false);
      setSectionToDelete(null);
    }
  };

  const confirmDeleteSection = (section: TaskSection) => {
    setSectionToDelete(section);
    setIsConfirmDeleteSectionOpen(true);
  };

  // Moved renderTask inside the component to ensure TaskItem is in scope
  const renderTask = useCallback((task: Task, index: number) => {
    const isDoToday = !doTodayOffIds.has(task.original_task_id || task.id); // Calculate isDoToday here
    return (
      <TaskItem
        key={task.id}
        task={task}
        onUpdate={updateTask} // Corrected prop name
        onDelete={deleteTask} // Corrected prop name
        onOpenOverview={onOpenOverview}
        allCategories={allCategories}
        isExpanded={expandedTasks[task.id] === true}
        toggleExpand={toggleTask} // Pass toggleTask as toggleExpand
        setFocusTask={setFocusTask}
        doTodayOffIds={doTodayOffIds}
        toggleDoToday={toggleDoToday} // Pass the function directly, it expects a Task object
        scheduledTasksMap={scheduledTasksMap}
        scheduledAppointment={scheduledTasksMap.get(task.id)} // Pass scheduledAppointment
        isDemo={isDemo}
        // Removed provided={provided}
        // Removed snapshot={snapshot}
        index={index}
        isSelected={selectedTaskIds.has(task.id)}
        onSelectTask={onSelectTask}
        allTasks={processedTasks} // Pass allTasks
        sections={sections} // Pass sections
        currentDate={currentDate} // Pass currentDate
        level={0} // Default level for top-level tasks
        isDoToday={isDoToday} // Pass the calculated isDoToday prop
      />
    );
  }, [updateTask, deleteTask, onOpenOverview, allCategories, expandedTasks, toggleTask, setFocusTask, doTodayOffIds, toggleDoToday, scheduledTasksMap, isDemo, selectedTaskIds, onSelectTask, processedTasks, sections, currentDate]);

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
          <DropdownMenuItem onClick={() => handleEditSection(section)}>Rename Section</DropdownMenuItem>
          <DropdownMenuItem onClick={() => markAllTasksInSectionCompleted(section.id)}>Mark All Completed</DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateSectionIncludeInFocusMode(section.id, !section.include_in_focus_mode)}>
            {section.include_in_focus_mode ? (
              <span className="flex items-center"><EyeOff className="mr-2 h-4 w-4" /> Exclude from Focus Mode</span>
            ) : (
              <span className="flex items-center"><Eye className="mr-2 h-4 w-4" /> Include in Focus Mode</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => confirmDeleteSection(section)}>Delete Section</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ), [expandedSections, editSectionId, editSectionName, toggleSection, handleUpdateSection, markAllTasksInSectionCompleted, updateSectionIncludeInFocusMode, confirmDeleteSection, handleEditSection]);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>;
  }

  const hasFiltersApplied = useMemo(() => {
    return filteredTasks.length === 0 && processedTasks.length > 0;
  }, [filteredTasks, processedTasks]);

  return (
    <div className="space-y-6">
      {filteredTasks.length === 0 && !loading && !hasFiltersApplied && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-semibold mb-2">No tasks for today!</p>
          <p className="mb-4">Time to relax or add some new tasks.</p>
          <QuickAddTask
            sectionId={null}
            onAddTask={handleAddTask}
            defaultCategoryId={allCategories[0]?.id || ''}
            isDemo={isDemo}
            allCategories={allCategories}
            currentDate={currentDate}
          />
        </div>
      )}

      {filteredTasks.length === 0 && !loading && hasFiltersApplied && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-semibold mb-2">No tasks match your current filters.</p>
          <p className="mb-4">Try adjusting your filters or clearing them.</p>
        </div>
      )}

      {tasksWithoutSection.length > 0 && (
        <div className="border rounded-lg bg-card shadow-sm">
          {renderSectionHeader({ id: 'no-section', name: 'No Section', order: -1, include_in_focus_mode: true, user_id: 'synthetic' }, tasksWithoutSection)}
          {expandedSections['no-section'] !== false && (
            <div className="p-3 space-y-2">
              {tasksWithoutSection.map((task, index) => renderTask(task, index))}
            </div>
          )}
          <div className="p-3 border-t">
            <QuickAddTask
              sectionId={null}
              onAddTask={handleAddTask}
              defaultCategoryId={allCategories[0]?.id || ''}
              isDemo={isDemo}
              allCategories={allCategories}
              currentDate={currentDate}
            />
          </div>
        </div>
      )}

      {sections.map(section => {
        const tasksInThisSection = getTasksForSection(section.id);
        if (tasksInThisSection.length === 0 && !isDemo) return null;

        return (
          <div key={section.id} className="border rounded-lg bg-card shadow-sm">
            {renderSectionHeader(section, tasksInThisSection)}
            {expandedSections[section.id] !== false && (
              <div className="p-3 space-y-2">
                {tasksInThisSection.map((task, index) => renderTask(task, index))}
              </div>
            )}
            <div className="p-3 border-t">
              <QuickAddTask
                sectionId={section.id}
                onAddTask={handleAddTask}
                defaultCategoryId={allCategories[0]?.id || ''}
                isDemo={isDemo}
                allCategories={allCategories}
                currentDate={currentDate}
              />
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