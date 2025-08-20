import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import DailyTasksHeader from '@/components/DailyTasksHeader';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';

const DailyTasksV3: React.FC<{ isDemo?: boolean; demoUserId?: string }> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = isDemo ? demoUserId : user?.id;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isRestoring, setIsRestoring] = useState(false);
  
  // We still need to call useTasks to initialize the hook, even if we don't use all returned values
  useTasks({ currentDate, userId });

  const handleRestoreTasks = async () => {
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
  };

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
                    <div className="text-center py-10 text-muted-foreground">
                      Task list component needs to be implemented
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="lg:w-80 lg:flex-shrink-0">
                <div className="bg-muted rounded-lg p-4 h-full">
                  <h3 className="font-semibold mb-2">Focus Panel</h3>
                  <p className="text-sm text-muted-foreground">Focus panel content would go here</p>
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