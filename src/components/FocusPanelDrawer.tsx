import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import FocusToolsPanel from './FocusToolsPanel'; // Corrected import
import { FocusPanelDrawerProps } from '@/types/props';

const FocusPanelDrawer: React.FC<FocusPanelDrawerProps> = ({
  isOpen,
  onClose,
  currentTask,
  onCompleteCurrentTask,
  onSkipCurrentTask,
  onOpenDetail,
  onOpenOverview,
  updateTask,
  sections,
  allCategories,
  handleAddTask,
  currentDate,
  isDemo,
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>Focus Tools</SheetTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </SheetHeader>
        <div className="flex-grow overflow-y-auto py-4">
          <FocusToolsPanel
            currentTask={currentTask}
            onCompleteCurrentTask={onCompleteCurrentTask}
            onSkipCurrentTask={onSkipCurrentTask}
            onOpenDetail={onOpenDetail}
            onOpenOverview={onOpenOverview}
            updateTask={updateTask}
            sections={sections}
            allCategories={allCategories}
            handleAddTask={handleAddTask}
            currentDate={currentDate}
            isDemo={isDemo}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FocusPanelDrawer;