import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  CheckCircle2
} from 'lucide-react';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface FocusToolsPanelProps {
  nextAvailableTask: Task | null;
  upcomingTasks: Task[];
  isTimerRunning: boolean;
  timerMode: 'work' | 'break';
  timeLeft: number;
  startTimer: () => void;
  pauseTimer: () => void;
  skipTimer: () => void;
  resetTimer: () => void;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
}

const FocusToolsPanel: React.FC<FocusToolsPanelProps> = ({
  nextAvailableTask,
  upcomingTasks,
  isTimerRunning,
  timerMode,
  timeLeft,
  startTimer,
  pauseTimer,
  skipTimer,
  resetTimer,
  updateTask,
}) => {
  const getPriorityDotColor = (priority: string | null) => {
    if (!priority) return 'bg-gray-400';
    switch (priority) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'urgent': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      await updateTask(task.id, { status: 'completed' });
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Timer Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Focus Timer</span>
            <Badge variant="secondary">
              {timerMode === 'work' ? 'Work' : 'Break'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-bold mb-4">
              {formatTime(timeLeft)}
            </div>
            <div className="flex justify-center gap-2">
              {!isTimerRunning ? (
                <Button onClick={startTimer} className="flex items-center gap-2">
                  <Play className="h-4 w-4" /> Start
                </Button>
              ) : (
                <Button onClick={pauseTimer} variant="secondary" className="flex items-center gap-2">
                  <Pause className="h-4 w-4" /> Pause
                </Button>
              )}
              <Button onClick={skipTimer} variant="outline" className="flex items-center gap-2">
                <SkipForward className="h-4 w-4" /> Skip
              </Button>
              <Button onClick={resetTimer} variant="outline" className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Task Card */}
      {nextAvailableTask && (
        <Card>
          <CardHeader>
            <CardTitle>Next Task</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex-grow flex flex-col justify-center items-center text-center space-y-3 p-2">
              <div className={cn("w-3 h-3 rounded-full", getPriorityDotColor(nextAvailableTask.priority || null))} />
              <h3 className="text-lg font-semibold leading-tight text-foreground line-clamp-3">
                {nextAvailableTask.description}
              </h3>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleCompleteTask(nextAvailableTask)}
                  className="flex items-center gap-1"
                >
                  <CheckCircle2 className="h-4 w-4" /> Complete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {upcomingTasks.map((task) => (
                <li key={task.id} className="flex items-center space-x-2">
                  <div className={cn("w-2 h-2 rounded-full", getPriorityDotColor(task.priority || null))} />
                  <span className="text-sm text-foreground truncate flex-grow">{task.description}</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6"
                    onClick={() => handleCompleteTask(task)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FocusToolsPanel;