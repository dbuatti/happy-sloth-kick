import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import FocusToolsPanel from './FocusToolsPanel';
import { Task, TaskSection, Category } from '@/hooks/useTasks';

interface FocusPanelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nextAvailableTask: Task | null;
  allTasks: Task[]; // Renamed from 'tasks' to 'allTasks', assumed to be processedTasks
  filteredTasks: Task[];
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onOpenDetail: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  sections: TaskSection[];
  allCategories: Category[];
  handleAddTask: (taskData: any) => Promise<any>;
  currentDate: Date;
}

const FocusPanelDrawer: React.FC<FocusPanelDrawerProps> = ({
  isOpen,
  onClose,
  nextAvailableTask,
  allTasks, // Use allTasks here
  filteredTasks,
  updateTask,
  onOpenDetail,
  onDeleteTask,
  sections,
  allCategories,
  handleAddTask,
  currentDate,
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Focus Tools</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-4">
          <FocusToolsPanel
            nextAvailableTask={nextAvailableTask}
            allTasks={allTasks} // Pass allTasks (processed)
            filteredTasks={filteredTasks}
            updateTask={updateTask}
            onDeleteTask={onDeleteTask}
            sections={sections}
            allCategories={allCategories}
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