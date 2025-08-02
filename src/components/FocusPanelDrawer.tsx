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
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onOpenDetail: (task: Task) => void; // Added this prop
  onDeleteTask: (taskId: string) => void;
  sections: TaskSection[];
  allCategories: Category[];
  currentDate: Date;
}

const FocusPanelDrawer: React.FC<FocusPanelDrawerProps> = ({
  isOpen,
  onClose,
  nextAvailableTask,
  tasks,
  filteredTasks,
  updateTask,
  onOpenDetail, // This prop is from FocusPanelDrawer, not ActiveTaskPanel
  onDeleteTask,
  sections,
  allCategories,
  currentDate,
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
            // Removed onOpenDetail prop as ActiveTaskPanel handles its own task detail opening
            onDeleteTask={onDeleteTask}
            sections={sections}
            allCategories={allCategories}
            currentDate={currentDate}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FocusPanelDrawer;