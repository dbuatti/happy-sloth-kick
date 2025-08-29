import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import FocusToolsPanel from './FocusToolsPanel';
import { Task } from '@/hooks/useTasks'; // Only import Task type
import { useTaskSections } from '@/hooks/useTaskSections'; // Import useTaskSections
import { useTaskCategories } from '@/hooks/useTaskCategories'; // Import useTaskCategories

interface FocusPanelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nextAvailableTask: Task | null;
  tasks: Task[];
  filteredTasks: Task[];
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onOpenDetail: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  // sections, allCategories are now from hooks, no longer passed as props
  handleAddTask: (taskData: any) => Promise<any>;
  currentDate: Date;
}

const FocusPanelDrawer: React.FC<FocusPanelDrawerProps> = ({
  isOpen,
  onClose,
  nextAvailableTask,
  tasks,
  filteredTasks,
  updateTask,
  onOpenDetail,
  onDeleteTask,
  // Removed sections, allCategories from props
  handleAddTask,
  currentDate,
}) => {
  const { data: sections } = useTaskSections(); // Use useTaskSections hook
  const { data: allCategories } = useTaskCategories(); // Use useTaskCategories hook

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Focus Tools</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-4">
          <FocusToolsPanel
            nextAvailableTask={nextAvailableTask}
            tasks={tasks}
            filteredTasks={filteredTasks}
            updateTask={updateTask}
            onDeleteTask={onDeleteTask}
            sections={sections} // Pass from hook
            allCategories={allCategories} // Pass from hook
            onOpenDetail={onOpenDetail}
            handleAddTask={handleAddTask}
            currentDate={currentDate}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FocusPanelDrawer;