import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PanelLeftOpen } from 'lucide-react';
import FocusToolsPanel from './FocusToolsPanel';
import { Task, TaskSection, TaskCategory, UpdateTaskData, DoTodayOffLogEntry } from '@/types';

interface FocusPanelDrawerProps {
  focusedTask: Task | null;
  focusModeTasks: Task[];
  allCategories: TaskCategory[];
  allSections: TaskSection[];
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  onCompleteTask: (taskId: string) => Promise<void>;
  onSkipTask: (taskId: string) => Promise<void>;
  doTodayOffLog: DoTodayOffLogEntry[] | undefined;
}

const FocusPanelDrawer: React.FC<FocusPanelDrawerProps> = ({
  focusedTask,
  focusModeTasks,
  allCategories,
  allSections,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
  onCompleteTask,
  onSkipTask,
  doTodayOffLog,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="fixed bottom-4 right-4 z-50">
          <PanelLeftOpen className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Focus Panel</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-4">
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
            onCompleteTask={onCompleteTask}
            onSkipTask={onSkipTask}
            doTodayOffLog={doTodayOffLog}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FocusPanelDrawer;