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
  setFocusTask: (taskId: string | null) => Promise<void>; // New prop
  doTodayOffIds: Set<string>; // New prop
  toggleDoToday: (task: Task) => void; // New prop
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
  setFocusTask, // Destructure new prop
  doTodayOffIds, // Destructure new prop
  toggleDoToday, // Destructure new prop
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
            setFocusTask={setFocusTask} // Pass new prop
            doTodayOffIds={doTodayOffIds} // Pass new prop
            toggleDoToday={toggleDoToday} // Pass new prop
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FocusPanelDrawer;