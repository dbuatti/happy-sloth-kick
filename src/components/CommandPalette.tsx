import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Task, useTasks, NewTaskData, NewTaskSectionData, UpdateTaskSectionData, NewCategoryData, UpdateCategoryData } from '@/hooks/useTasks';
import { useIsMobile } from '@/hooks/useIsMobile';
import { PlusCircle, Search } from 'lucide-react';
import AddTaskForm from './AddTaskForm';
// import { useDoToday } from '@/hooks/useDoToday'; // Removed unused import

interface CommandPaletteProps {
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (isOpen: boolean) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void; // Kept for potential future use, though not directly used here
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isCommandPaletteOpen,
  setIsCommandPaletteOpen,
  currentDate,
  // setCurrentDate, // Removed unused prop
}) => {
  // const { user } = useAuth(); // Removed unused variable
  const { tasks, sections, allCategories, createTask, createSection, updateSection, deleteSection, updateSectionIncludeInFocusMode, createCategory, updateCategory, deleteCategory } = useTasks({ currentDate });
  const isMobile = useIsMobile();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);

  const filteredTasks = React.useMemo(() => {
    if (!searchTerm) return [];
    return tasks.filter(task =>
      task.description.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10); // Limit results
  }, [tasks, searchTerm]);

  const handleNewTaskSubmit = async (data: NewTaskData) => {
    const result = await createTask(data);
    if (result) {
      setSearchTerm(''); // Clear search after adding task
      return result;
    }
    return null;
  };

  const handleSelectTask = (task: Task) => {
    // Implement navigation or action for selected task
    console.log('Selected task:', task);
    setIsCommandPaletteOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      setIsCommandPaletteOpen((prev: boolean) => !prev); // Explicitly type prev
      setSearchTerm(''); // Clear search when opening/closing
    }
  }, [setIsCommandPaletteOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const DialogComponent = isMobile ? Sheet : Dialog;
  const DialogContentComponent = isMobile ? SheetContent : DialogContent;
  const DialogHeaderComponent = isMobile ? SheetHeader : DialogHeader;
  const DialogTitleComponent = isMobile ? SheetTitle : DialogTitle;

  return (
    <DialogComponent open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen}>
      <DialogContentComponent className={isMobile ? "h-full flex flex-col" : "sm:max-w-[600px]"}>
        <DialogHeaderComponent>
          <DialogTitleComponent>Quick Actions</DialogTitleComponent>
        </DialogHeaderComponent>
        <div className="flex items-center space-x-2 mb-4">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search tasks or commands..."
            className="flex-grow"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={() => setIsAddTaskDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Task
          </Button>
        </div>
        <div className="flex-grow overflow-y-auto">
          {searchTerm.length > 0 && filteredTasks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Tasks</h3>
              {filteredTasks.map(task => (
                <Button
                  key={task.id}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleSelectTask(task)}
                >
                  {task.description}
                </Button>
              ))}
            </div>
          )}
          {searchTerm.length > 0 && filteredTasks.length === 0 && (
            <p className="text-center text-muted-foreground">No tasks found matching "{searchTerm}".</p>
          )}
        </div>
      </DialogContentComponent>

      {/* Add Task Dialog (can be a separate component if complex) */}
      <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <AddTaskForm
            onAddTask={handleNewTaskSubmit}
            onTaskAdded={() => setIsAddTaskDialogOpen(false)}
            sections={sections}
            allCategories={allCategories}
            currentDate={currentDate}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            createCategory={createCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
          />
        </DialogContent>
      </Dialog>
    </DialogComponent>
  );
};

export default CommandPalette;