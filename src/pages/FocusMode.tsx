"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import FocusToolsPanel from '@/components/FocusToolsPanel';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments';

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [currentDate] = useState(new Date());
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isFullScreenFocusViewOpen, setIsFullScreenFocusViewOpen] = useState(false);

  const {
    processedTasks,
    filteredTasks,
    loading,
    handleAddTask,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    nextAvailableTask,
  } = useTasks({ currentDate, userId, viewMode: 'focus' });

  const { appointments: allAppointments } = useAllAppointments();

  const scheduledTasksMap = React.useMemo(() => {
    const map = new Map<string, Appointment>();
    allAppointments.forEach(app => {
      if (app.task_id) {
        map.set(app.task_id, app);
      }
    });
    return map;
  }, [allAppointments]);

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleMarkDoneFromFocusView = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      setIsFullScreenFocusViewOpen(false);
    }
  };

  const handleOpenFocusView = () => {
    setIsFullScreenFocusViewOpen(true);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <Card className="w-full shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold">Focus Mode</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Your Focus Tasks</h2>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="rounded-xl p-4 bg-muted/50 animate-pulse h-24" />
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No tasks currently in focus. Add some tasks or adjust your sections!
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map(task => (
                    <div
                      key={task.id}
                      className="p-4 rounded-xl bg-card shadow-sm flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleOpenTaskOverview(task)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${task.priority === 'urgent' ? 'bg-red-500' : task.priority === 'high' ? 'bg-orange-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                        <span className="font-medium text-lg">{task.description}</span>
                      </div>
                      {task.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="lg:col-span-1">
              <FocusToolsPanel
                nextAvailableTask={nextAvailableTask}
                allTasks={processedTasks}
                filteredTasks={filteredTasks}
                updateTask={updateTask}
                onDeleteTask={deleteTask}
                sections={sections}
                allCategories={allCategories}
                onOpenDetail={handleOpenTaskOverview}
                handleAddTask={handleAddTask}
                currentDate={currentDate}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isFullScreenFocusViewOpen && nextAvailableTask && (
        <FullScreenFocusView
          taskDescription={nextAvailableTask.description}
          onClose={() => setIsFullScreenFocusViewOpen(false)}
          onMarkDone={handleMarkDoneFromFocusView}
        />
      )}
    </div>
  );
};

export default FocusMode;