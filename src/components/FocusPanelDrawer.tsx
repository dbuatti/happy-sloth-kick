import React, { useState } from 'react';
import { Task } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ChevronRight, X } from 'lucide-react';

interface FocusPanelDrawerProps {
  filteredTasks: Task[];
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>; // Fix return type
  onDeleteTask: (id: string) => Promise<void>;
  isDemo?: boolean;
}

const FocusPanelDrawer: React.FC<FocusPanelDrawerProps> = ({
  filteredTasks,
  updateTask,
  onDeleteTask,
  isDemo = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleCompleteTask = async (task: Task) => {
    await updateTask(task.id, { status: 'completed' });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          className="fixed right-4 top-1/2 transform -translate-y-1/2 rounded-l-none rounded-r-md"
          size="icon"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-80">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>Focus Panel</SheetTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <span className="text-sm truncate">{task.description}</span>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleCompleteTask(task)}
                    disabled={isDemo}
                  >
                    Complete
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onDeleteTask(task.id)}
                    disabled={isDemo}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">No tasks in focus</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FocusPanelDrawer;