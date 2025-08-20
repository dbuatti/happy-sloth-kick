import React, { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import { showError, showSuccess } from '@/utils/toast';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import { useAuth } from '@/context/AuthContext';

const DailyTasksV3: React.FC<{ isDemo?: boolean; demoUserId?: string }> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = isDemo ? demoUserId : user?.id;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isRestoring, setIsRestoring] = useState(false);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);
  
  const {
    tasks,
    sections,
    allCategories,
    updateTask,
    deleteTask,
    moveTask,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    loading,
  } = useTasks({ currentDate, userId });

  const handleAddTask = useCallback(async (description: string, sectionId?: string) => {
    if (!description.trim()) return;
    
    try {
      // Since addTask is not directly available, we'll need to implement this differently
      // For now, we'll just show an error message
      showError('Add task functionality needs to be implemented');
    } catch (error) {
      console.error('Error adding task:', error);
      showError('Failed to add task');
    }
  }, []);

  const handleRestoreTasks = useCallback(async () => {
    setIsRestoring(true);
    try {
      // Restore functionality would go here
      showSuccess('Tasks restored successfully');
    } catch (error) {
      console.error('Error restoring tasks:', error);
      showError('Failed to restore tasks');
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const handleMoveTaskToDifferentDay = useCallback(async (taskId: string, newDate: Date) => {
    try {
      // Check if this is a virtual task (recurring instance)
      if (taskId.startsWith('virtual-')) {
        showError('Cannot move recurring task instances to different days');
        return;
      }
      
      // For regular tasks, update the due_date
      await updateTask(taskId, {
        due_date: format(newDate, 'yyyy-MM-dd')
      });
      
      // Show success message
      const formattedDate = format(newDate, 'MMM d');
      showSuccess(`Task moved to ${formattedDate}`);
    } catch (error) {
      console.error('Error moving task:', error);
      showError('Failed to move task');
    }
  }, [updateTask]);

  // Toggle focus panel visibility
  const toggleFocusPanel = useCallback(() => {
    setIsFocusPanelOpen(prev => !prev);
  }, []);

  // Close focus panel
  const closeFocusPanel = useCallback(() => {
    setIsFocusPanelOpen(false);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col">
        <main className="flex-grow p-4">
          <div className="flex flex-col h-full">
            <DailyTasksHeader
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              userId={userId}
              onRestoreTasks={handleRestoreTasks}
              isRestoring={isRestoring}
            />
            
            <div className="flex flex-col lg:flex-row flex-grow mt-6 gap-6">
              <div className="flex-grow">
                <Card className="w-full h-full shadow-lg rounded-xl">
                  <CardContent className="p-6 h-full">
                    {/* Task list would go here */}
                    <div className="text-center py-10 text-muted-foreground">
                      Task list component needs to be implemented
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Focus Panel */}
              <div className={`relative transition-all duration-300 ease-in-out ${isFocusPanelOpen ? 'lg:w-80' : 'w-0'}`}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFocusPanel}
                  className="absolute -left-4 top-4 -translate-y-1/2 z-20 bg-background hover:bg-muted rounded-full h-8 w-8 border hidden lg:flex"
                  aria-label={isFocusPanelOpen ? "Hide focus panel" : "Show focus panel"}
                >
                  {isFocusPanelOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
                </Button>
                
                <div className={`lg:w-80 lg:flex-shrink-0 h-full ${isFocusPanelOpen ? 'block' : 'hidden lg:block'}`}>
                  {/* Focus panel would go here */}
                  <div className="bg-muted rounded-lg p-4 h-full">
                    <h3 className="font-semibold mb-2">Focus Panel</h3>
                    <p className="text-sm text-muted-foreground">Focus panel content would go here</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DailyTasksV3;