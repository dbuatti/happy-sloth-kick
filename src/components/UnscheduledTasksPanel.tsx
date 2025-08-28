import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PanelRightClose, PanelRightOpen, ListTodo } from 'lucide-react'; // Added ListTodo icon
import DraggableScheduleTaskItem from '@/components/DraggableScheduleTaskItem';
import { Task, TaskSection } from '@/hooks/useTasks';

interface UnscheduledTasksPanelProps {
  unscheduledDoTodayTasks: Task[];
  sections: TaskSection[];
  isTaskPanelCollapsed: boolean;
  setIsTaskPanelCollapsed: (collapsed: boolean) => void;
}

const UnscheduledTasksPanel: React.FC<UnscheduledTasksPanelProps> = ({
  unscheduledDoTodayTasks,
  sections,
  isTaskPanelCollapsed,
  setIsTaskPanelCollapsed,
}) => {
  return (
    <div className="relative mt-6 lg:mt-0">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsTaskPanelCollapsed(!isTaskPanelCollapsed)}
        className={cn(
          "absolute -left-4 top-1/2 -translate-y-1/2 z-20 bg-background hover:bg-muted rounded-full h-8 w-8 border hidden lg:flex",
          isTaskPanelCollapsed && "lg:hidden"
        )}
        aria-label={isTaskPanelCollapsed ? "Show task panel" : "Hide task panel"}
      >
        {isTaskPanelCollapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
      </Button>
      <div className={cn(
        "lg:w-[300px] lg:flex-shrink-0",
        isTaskPanelCollapsed && "hidden"
      )}>
        <div className="lg:sticky lg:top-4 space-y-4 bg-card rounded-lg p-4 shadow-lg">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" /> Unscheduled Tasks
          </h3>
          <div className="space-y-2 max-h-[calc(100vh-20rem)] overflow-y-auto p-1">
            {unscheduledDoTodayTasks.length > 0 ? (
              unscheduledDoTodayTasks.map(task => (
                <DraggableScheduleTaskItem key={task.id} task={task} sections={sections} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No tasks to schedule.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnscheduledTasksPanel;