import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import FocusToolsPanel from './FocusToolsPanel';
import { Task, TaskSection, TaskCategory, UpdateTaskData, FocusModeProps } from '@/types';

interface FocusPanelDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  focusedTask: Task | undefined;
  focusModeTasks: Task[];
  allCategories: TaskCategory[];
  allSections: TaskSection[];
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
}

const FocusPanelDrawer: React.FC<FocusPanelDrawerProps> = ({
  isOpen,
  onOpenChange,
  focusedTask,
  focusModeTasks,
  allCategories,
  allSections,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Focus Tools</SheetTitle>
        </SheetHeader>
        <div className="py-4">
          <FocusToolsPanel
            focusedTask={focusedTask}
            focusModeTasks={focusModeTasks}
            allCategories={allCategories}
            allSections={allSections}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onAddSubtask={onAddSubtask}
            onToggleFocusMode={onToggleFocusMode}
            onLogDoTodayOff={onLogDoTodayOff}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FocusPanelDrawer;