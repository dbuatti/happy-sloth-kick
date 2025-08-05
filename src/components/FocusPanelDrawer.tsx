import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ActiveTaskPanel from './ActiveTaskPanel';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
// Removed useAuth as it's not directly used in this component's logic

interface FocusPanelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nextAvailableTask: Task | null;
  tasks: Task[];
  filteredTasks: Task[];
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onOpenDetail: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  sections: TaskSection[];
  allCategories: Category[];
  // Removed currentDate as it's not directly used here
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
  sections,
  allCategories,
  // Removed currentDate from destructuring
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Focus Tools</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-4">
          <ActiveTaskPanel
            nextAvailableTask={nextAvailableTask}
            tasks={tasks}
            filteredTasks={filteredTasks}
            updateTask={updateTask}
            onDeleteTask={onDeleteTask}
            sections={sections}
            allCategories={allCategories}
            onOpenDetail={onOpenDetail}
            // Removed currentDate prop from here as it's not used by ActiveTaskPanel
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FocusPanelDrawer;