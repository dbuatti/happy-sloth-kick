import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw, CheckCircle2, Lightbulb, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Task, useTasks } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

const WORK_DURATION = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK_DURATION = 5 * 60; // 5 minutes in seconds
const LONG_BREAK_DURATION = 15 * 60; // 15 minutes in seconds
const POMODORO_CYCLES = 4; // Number of work sessions before a long break

type SessionType = 'work' | 'short_break' | 'long_break';

const FocusMode: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const { tasks, updateTask } = useTasks();

  const [timeRemaining, setTimeRemaining] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>('work');
  const [pomodoroCount, setPomodoroCount] = useState(0); // Completed work sessions
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null); // Task being focused on
  const [suggestedTasks, setSuggestedTasks] = useState<Task[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestedTasks = useCallback(() => {
    if (!tasks) return [];
    const activeTasks = tasks.filter(
      t => t.status === 'to-do' && t.recurring_type === 'none' && t.original_task_id === null
    );
    // Prioritize high/urgent tasks, then due today/overdue
    const sortedTasks = activeTasks.sort((a, b) => {
      const priorityOrder: { [key: string]: number } = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1, 'none': 0 };
      const aPrio = priorityOrder[a.priority] || 0;
      const bPrio = priorityOrder[b.priority] || 0;

      if (aPrio !== bPrio) return bPrio - aPrio; // Higher priority first

      const aDueDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bDueDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return aDueDate - bDueDate; // Sooner due date first
    });
    setSuggestedTasks(sortedTasks.slice(0, 5)); // Get top 5 suggestions
  }, [tasks]);

  useEffect(() => {
    fetchSuggestedTasks();
  }, [fetchSuggestedTasks, tasks]); // Re-fetch suggestions if tasks change

  const logSession = useCallback(async (type: SessionType, duration: number, start: Date, end: Date, taskId: string | null, completedDuringSession: boolean) => {
    if (!userId) return;
    try {
      const { error } = await supabase.from('focus_sessions').insert({
        user_id: userId,
        session_type: type,
        duration_minutes: Math.round(duration / 60),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        task_id: taskId,
        completed_during_session: completedDuringSession,
      });
      if (error) throw error;
      console.log('Focus session logged successfully!');
    } catch (error: any) {
      console.error('Error logging focus session:', error.message);
      showError('Failed to log focus session.');
    }
  }, [userId]);

  const startTimer = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
      setSessionStartTime(new Date());
      timerRef.current = setInterval(() => {
        setTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current!);
            handleSessionEnd();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
  }, [isRunning]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    pauseTimer();
    setTimeRemaining(WORK_DURATION);
    setSessionType('work');
    setPomodoroCount(0);
    setCurrentTaskId(null);
    setSessionStartTime(null);
    fetchSuggestedTasks(); // Refresh suggestions on reset
  }, [pauseTimer, fetchSuggestedTasks]);

  const handleSessionEnd = useCallback(() => {
    const endTime = new Date();
    if (sessionStartTime) {
      const actualDuration = (endTime.getTime() - sessionStartTime.getTime()) / 1000;
      logSession(sessionType, actualDuration, sessionStartTime, endTime, currentTaskId, false); // Log session
    }

    if (sessionType === 'work') {
      const newPomodoroCount = pomodoroCount + 1;
      setPomodoroCount(newPomodoroCount);
      if (newPomodoroCount % POMODORO_CYCLES === 0) {
        setSessionType('long_break');
        setTimeRemaining(LONG_BREAK_DURATION);
        showSuccess('Work session complete! Time for a long break.');
      } else {
        setSessionType('short_break');
        setTimeRemaining(SHORT_BREAK_DURATION);
        showSuccess('Work session complete! Time for a short break.');
      }
    } else {
      setSessionType('work');
      setTimeRemaining(WORK_DURATION);
      showSuccess('Break over! Time to focus.');
    }
    setIsRunning(false);
    setSessionStartTime(null);
    setCurrentTaskId(null); // Clear focused task after session
    fetchSuggestedTasks(); // Refresh suggestions for next work session
  }, [sessionType, pomodoroCount, sessionStartTime, currentTaskId, logSession, fetchSuggestedTasks]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleMarkTaskComplete = async (task: Task) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      await updateTask(task.id, { status: 'completed' });
      showSuccess(`Task "${task.description}" completed!`);
      // Log this completion as part of the current session if one is active
      if (isRunning && sessionType === 'work' && sessionStartTime) {
        const endTime = new Date();
        const actualDuration = (endTime.getTime() - sessionStartTime.getTime()) / 1000;
        logSession(sessionType, actualDuration, sessionStartTime, endTime, task.id, true);
      }
      setCurrentTaskId(null); // Clear focused task
      fetchSuggestedTasks(); // Refresh suggestions
    } catch (error) {
      showError('Failed to mark task as complete.');
      console.error('Error marking task complete:', error);
    }
  };

  const handleSelectTaskForFocus = (task: Task) => {
    setCurrentTaskId(task.id);
    showSuccess(`Focusing on: "${task.description}"`);
  };

  const currentTaskDetails = currentTaskId ? tasks.find(t => t.id === currentTaskId) : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Focus Mode</CardTitle>
          <p className="text-muted-foreground">
            {sessionType === 'work' ? 'Time to focus!' : 'Take a well-deserved break.'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
            <Progress
              value={(timeRemaining / (sessionType === 'work' ? WORK_DURATION : sessionType === 'short_break' ? SHORT_BREAK_DURATION : LONG_BREAK_DURATION)) * 100}
              className={cn( // Combined classes here
                "absolute w-full h-full rounded-full",
                "transition-all duration-1000 ease-linear",
                sessionType === 'work' && "bg-primary",
                sessionType === 'short_break' && "bg-green-500",
                sessionType === 'long_break' && "bg-blue-500"
              )}
            />
            <div className="relative z-10 text-5xl font-bold">
              {formatTime(timeRemaining)}
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <Button
              size="lg"
              onClick={isRunning ? pauseTimer : startTimer}
              className={cn(
                "w-24",
                isRunning ? "bg-yellow-500 hover:bg-yellow-600" : "bg-primary hover:bg-primary-foreground"
              )}
            >
              {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
            <Button size="lg" variant="outline" onClick={resetTimer} className="w-24">
              <RotateCcw className="h-6 w-6" />
            </Button>
          </div>

          {sessionType === 'work' && (
            <div className="mt-6 space-y-4">
              {currentTaskDetails ? (
                <Card className="border-2 border-primary-foreground bg-primary/10 dark:bg-primary/20">
                  <CardContent className="p-4">
                    <h4 className="text-lg font-semibold mb-2 flex items-center justify-between">
                      <span>Focusing on:</span>
                      <Button variant="ghost" size="icon" onClick={() => setCurrentTaskId(null)} className="h-6 w-6">
                        <X className="h-4 w-4" />
                      </Button>
                    </h4>
                    <p className="text-xl font-medium mb-3">{currentTaskDetails.description}</p>
                    <Button
                      onClick={() => handleMarkTaskComplete(currentTaskDetails)}
                      className="w-full"
                      variant="secondary"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Complete
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed border-2 border-muted-foreground p-4">
                  <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" /> Suggested Tasks
                  </h4>
                  {suggestedTasks.length > 0 ? (
                    <ul className="space-y-2 text-left">
                      {suggestedTasks.map(task => (
                        <li key={task.id} className="flex items-center justify-between">
                          <span className="text-sm">{task.description}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectTaskForFocus(task)}
                          >
                            Focus
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active tasks to suggest. Add some!</p>
                  )}
                </Card>
              )}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Completed Pomodoros: {pomodoroCount} / {POMODORO_CYCLES}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FocusMode;