import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/Progress";
import { Play, Pause, RotateCcw, CheckCircle2, Lightbulb, X, Timer as TimerIcon, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Task, useTasks } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useUI } from '@/context/UIContext';
import { useSound } from '@/context/SoundContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const WORK_DURATION = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK_DURATION = 5 * 60; // 5 minutes in seconds
const LONG_BREAK_DURATION = 15 * 60; // 15 minutes in seconds
const POMODORO_CYCLES = 4; // Number of work sessions before a long break

type SessionType = 'work' | 'short_break' | 'long_break';

interface ProductivityTimerProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}

const ProductivityTimer: React.FC<ProductivityTimerProps> = ({ currentDate, setCurrentDate }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const { filteredTasks, updateTask, sections } = useTasks({ currentDate: new Date(), setCurrentDate: () => {}, viewMode: 'focus' }); 
  const { setIsFocusModeActive } = useUI();
  const { playSound } = useSound();

  // Pomodoro states
  const [pomodoroTimeRemaining, setPomodoroTimeRemaining] = useState(WORK_DURATION);
  const [pomodoroIsRunning, setPomodoroIsRunning] = useState(false);
  const [pomodoroSessionType, setPomodoroSessionType] = useState<SessionType>('work');
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [pomodoroCurrentTaskId, setPomodoroCurrentTaskId] = useState<string | null>(null);
  const [pomodoroSessionStartTime, setPomodoroSessionStartTime] = useState<Date | null>(null);
  const pomodoroTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Custom Timer states
  const [customDuration, setCustomDuration] = useState(5 * 60); // Default to 5 minutes
  const [customTimeRemaining, setCustomTimeRemaining] = useState(5 * 60);
  const [customIsRunning, setCustomIsRunning] = useState(false);
  const customTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [activeTab, setActiveTab] = useState('pomodoro'); // 'pomodoro' or 'custom'

  const suggestedTasks = React.useMemo(() => {
    if (!filteredTasks || !sections) return [];
    const activeTasks = filteredTasks.filter(t => t.status === 'to-do');
    const sortedTasks = activeTasks.sort((a, b) => {
      const priorityOrder: { [key: string]: number } = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1, 'none': 0 };
      const aPrio = priorityOrder[a.priority] || 0;
      const bPrio = priorityOrder[b.priority] || 0;
      if (aPrio !== bPrio) return bPrio - aPrio;
      const aDueDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bDueDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return aDueDate - bDueDate;
    });
    return sortedTasks.slice(0, 5);
  }, [filteredTasks, sections]);

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
    }
    catch (error: any) {
      console.error('Error logging focus session:', error.message);
      showError('Failed to log focus session.');
    }
  }, [userId]);

  const handlePomodoroSessionEnd = useCallback(() => {
    const endTime = new Date();
    if (pomodoroSessionStartTime) {
      const actualDuration = (endTime.getTime() - pomodoroSessionStartTime.getTime()) / 1000;
      logSession(pomodoroSessionType, actualDuration, pomodoroSessionStartTime, endTime, pomodoroCurrentTaskId, false);
    }
    playSound('alert'); // Play alert sound when session ends

    if (pomodoroSessionType === 'work') {
      const newPomodoroCount = pomodoroCount + 1;
      setPomodoroCount(newPomodoroCount);
      if (newPomodoroCount % POMODORO_CYCLES === 0) {
        setPomodoroSessionType('long_break');
        setPomodoroTimeRemaining(LONG_BREAK_DURATION);
        showSuccess('Work session complete! Time for a long break.');
      } else {
        setPomodoroSessionType('short_break');
        setPomodoroTimeRemaining(SHORT_BREAK_DURATION);
        showSuccess('Work session complete! Time for a short break.');
      }
    } else {
      setPomodoroSessionType('work');
      setPomodoroTimeRemaining(WORK_DURATION);
      showSuccess('Break over! Time to focus.');
    }
    setPomodoroIsRunning(false);
    setPomodoroSessionStartTime(null);
    setPomodoroCurrentTaskId(null);
  }, [pomodoroSessionType, pomodoroCount, pomodoroSessionStartTime, pomodoroCurrentTaskId, logSession, playSound]);

  const handleCustomTimerEnd = useCallback(() => {
    setCustomIsRunning(false);
    playSound('alert'); // Play alert sound when custom timer finishes
    showSuccess('Custom timer finished!');
  }, [playSound]);

  // Effect for Pomodoro Timer
  useEffect(() => {
    if (pomodoroIsRunning) {
      pomodoroTimerRef.current = setInterval(() => {
        setPomodoroTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            clearInterval(pomodoroTimerRef.current!);
            handlePomodoroSessionEnd();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (pomodoroTimerRef.current) {
        clearInterval(pomodoroTimerRef.current);
      }
    }
    return () => {
      if (pomodoroTimerRef.current) {
        clearInterval(pomodoroTimerRef.current);
      }
    };
  }, [pomodoroIsRunning, handlePomodoroSessionEnd]);

  // Effect for Custom Timer
  useEffect(() => {
    if (customIsRunning) {
      customTimerRef.current = setInterval(() => {
        setCustomTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            clearInterval(customTimerRef.current!);
            handleCustomTimerEnd();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (customTimerRef.current) {
        clearInterval(customTimerRef.current);
      }
    }
    return () => {
      if (customTimerRef.current) {
        clearInterval(customTimerRef.current);
      }
    };
  }, [customIsRunning, handleCustomTimerEnd]);

  // UI Context for sidebar visibility
  useEffect(() => {
    setIsFocusModeActive(activeTab === 'pomodoro' && pomodoroIsRunning);
    return () => {
      setIsFocusModeActive(false);
    };
  }, [setIsFocusModeActive, activeTab, pomodoroIsRunning]);

  const startPomodoroTimer = useCallback(() => {
    if (!pomodoroIsRunning) {
      setPomodoroIsRunning(true);
      setPomodoroSessionStartTime(new Date());
      playSound('success'); // Play success sound on start
    }
  }, [pomodoroIsRunning, playSound]);

  const pausePomodoroTimer = useCallback(() => {
    setPomodoroIsRunning(false);
    if (pomodoroTimerRef.current) {
      clearInterval(pomodoroTimerRef.current);
      pomodoroTimerRef.current = null;
      playSound('pause'); // Play pause sound on pause
    }
  }, [playSound]);

  const resetPomodoroTimer = useCallback(() => {
    pausePomodoroTimer();
    setPomodoroTimeRemaining(WORK_DURATION);
    setPomodoroSessionType('work');
    setPomodoroCount(0);
    setPomodoroCurrentTaskId(null);
    setPomodoroSessionStartTime(null);
    playSound('reset'); // Play reset sound on reset
  }, [pausePomodoroTimer, playSound]);

  const handleMarkTaskComplete = async (task: Task) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      await updateTask(task.id, { status: 'completed' });
      showSuccess(`Task "${task.description}" completed!`);
      if (pomodoroIsRunning && pomodoroSessionType === 'work' && pomodoroSessionStartTime) {
        const endTime = new Date();
        const actualDuration = (endTime.getTime() - pomodoroSessionStartTime.getTime()) / 1000;
        logSession(pomodoroSessionType, actualDuration, pomodoroSessionStartTime, endTime, task.id, true);
      }
      setPomodoroCurrentTaskId(null);
    } catch (error) {
      showError('Failed to mark task as complete.');
      console.error('Error marking task complete:', error);
    }
  };

  const handleSelectTaskForFocus = (task: Task) => {
    setPomodoroCurrentTaskId(task.id);
    showSuccess(`Focusing on: "${task.description}"`);
  };

  const currentTaskDetails = pomodoroCurrentTaskId ? filteredTasks.find(t => t.id === pomodoroCurrentTaskId) : null;

  // Custom Timer functions
  const startCustomTimer = useCallback(() => {
    if (!customIsRunning && customTimeRemaining > 0) {
      setCustomIsRunning(true);
      playSound('success'); // Play success sound on start
    }
  }, [customIsRunning, customTimeRemaining, playSound]);

  const pauseCustomTimer = useCallback(() => {
    setCustomIsRunning(false);
    if (customTimerRef.current) {
      clearInterval(customTimerRef.current);
      customTimerRef.current = null;
      playSound('pause'); // Play pause sound on pause
    }
  }, [playSound]);

  const resetCustomTimer = useCallback(() => {
    pauseCustomTimer();
    setCustomTimeRemaining(customDuration);
    playSound('reset'); // Play reset sound on reset
  }, [pauseCustomTimer, customDuration, playSound]);

  const handleCustomDurationChange = (value: string) => {
    const newDuration = parseInt(value) * 60;
    setCustomDuration(newDuration);
    if (!customIsRunning) {
      setCustomTimeRemaining(newDuration);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const currentTimerValue = activeTab === 'pomodoro' ? pomodoroTimeRemaining : customTimeRemaining;
  const currentDurationBase = activeTab === 'pomodoro' 
    ? (pomodoroSessionType === 'work' ? WORK_DURATION : pomodoroSessionType === 'short_break' ? SHORT_BREAK_DURATION : LONG_BREAK_DURATION)
    : customDuration;
  const currentIsRunning = activeTab === 'pomodoro' ? pomodoroIsRunning : customIsRunning;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Productivity Timers</CardTitle>
          <p className="text-muted-foreground">
            Choose your focus method.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 min-h-[500px]"> {/* Added min-h to prevent layout shift */}
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value as 'pomodoro' | 'custom');
            // Pause any running timer when switching tabs
            if (pomodoroIsRunning) pausePomodoroTimer();
            if (customIsRunning) pauseCustomTimer();
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pomodoro">Pomodoro</TabsTrigger>
              <TabsTrigger value="custom">Custom Timer</TabsTrigger>
            </TabsList>

            <div className="relative w-48 h-48 mx-auto flex items-center justify-center mt-6">
              <Progress
                value={(currentTimerValue / currentDurationBase) * 100}
                className="absolute w-full h-full rounded-full bg-muted"
                indicatorClassName={cn(
                  "transition-all duration-1000 ease-linear",
                  activeTab === 'pomodoro' && pomodoroSessionType === 'work' && "bg-primary",
                  activeTab === 'pomodoro' && pomodoroSessionType === 'short_break' && "bg-green-500",
                  activeTab === 'pomodoro' && pomodoroSessionType === 'long_break' && "bg-blue-500",
                  activeTab === 'custom' && "bg-purple-500"
                )}
              />
              <div className={cn(
                "relative z-10 text-5xl font-bold",
                activeTab === 'pomodoro' && pomodoroSessionType === 'work' ? "text-primary-foreground" : "text-white"
              )}>
                {formatTime(currentTimerValue)}
              </div>
            </div>

            <div className="flex justify-center space-x-4 mt-6">
              <Button
                size="lg"
                onClick={activeTab === 'pomodoro' ? (pomodoroIsRunning ? pausePomodoroTimer : startPomodoroTimer) : (customIsRunning ? pauseCustomTimer : startCustomTimer)}
                className={cn(
                  "w-24",
                  currentIsRunning ? "bg-yellow-500 hover:bg-yellow-600" : (activeTab === 'pomodoro' ? "bg-primary hover:bg-primary-foreground" : "bg-purple-600 hover:bg-purple-700")
                )}
              >
                {currentIsRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={activeTab === 'pomodoro' ? resetPomodoroTimer : resetCustomTimer} 
                className="w-24"
              >
                <RotateCcw className="h-6 w-6" />
              </Button>
            </div>

            <TabsContent value="pomodoro" className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                {pomodoroSessionType === 'work' ? 'Time to focus!' : 'Take a well-deserved break.'}
              </p>
              {pomodoroSessionType === 'work' && (
                <>
                  {currentTaskDetails ? (
                    <Card className="border-2 border-primary-foreground bg-primary/10 dark:bg-primary/20">
                      <CardContent className="p-4">
                        <h4 className="text-lg font-semibold mb-2 flex items-center justify-between">
                          <span>Focusing on:</span>
                          <Button variant="ghost" size="icon" onClick={() => setPomodoroCurrentTaskId(null)} className="h-6 w-6">
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
                </>
              )}
              <p className="text-sm text-muted-foreground">
                Completed Pomodoros: {pomodoroCount} / {POMODORO_CYCLES}
              </p>
            </TabsContent>

            <TabsContent value="custom" className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Set a custom timer for any activity.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Select Duration:</p>
                <Select value={(customDuration / 60).toString()} onValueChange={handleCustomDurationChange} disabled={customIsRunning}>
                  <SelectTrigger className="w-full max-w-[180px] mx-auto">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Minutes</SelectItem>
                    <SelectItem value="10">10 Minutes</SelectItem>
                    <SelectItem value="15">15 Minutes</SelectItem>
                    <SelectItem value="20">20 Minutes</SelectItem>
                    <SelectItem value="30">30 Minutes</SelectItem>
                    <SelectItem value="45">45 Minutes</SelectItem>
                    <SelectItem value="60">60 Minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default ProductivityTimer;