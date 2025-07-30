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
import { useTimer } from '@/hooks/useTimer'; // Import useTimer hook
import { useFocusSessions } from '@/hooks/useFocusSessions'; // Import useFocusSessions hook
import { formatISO } from 'date-fns';

const WORK_DURATION = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK_DURATION = 5 * 60; // 5 minutes in seconds
const LONG_BREAK_DURATION = 15 * 60; // 15 minutes in seconds
const POMODORO_CYCLES = 4; // Number of work sessions before a long break

type SessionType = 'work' | 'short_break' | 'long_break' | 'custom';

interface ProductivityTimerProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}

const ProductivityTimer: React.FC<ProductivityTimerProps> = ({ currentDate, setCurrentDate }) => {
  const { user } = useAuth();
  const userId = user?.id;

  const { filteredTasks, updateTask, sections } = useTasks({ viewMode: 'focus' }); 
  const { setIsFocusModeActive } = useUI();
  const { playSound } = useSound();
  const { addFocusSession } = useFocusSessions(); // Use the new hook

  // Pomodoro states
  const [pomodoroSessionType, setPomodoroSessionType] = useState<SessionType>('work');
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [pomodoroCurrentTaskId, setPomodoroCurrentTaskId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pomodoroCurrentTaskId');
    }
    return null;
  });
  const [pomodoroSessionStartTime, setPomodoroSessionStartTime] = useState<Date | null>(null);

  // Determine initial duration for Pomodoro timer based on session type
  const getPomodoroDuration = useCallback((type: SessionType) => {
    console.log(`[ProductivityTimer] getPomodoroDuration: type=${type}`);
    switch (type) {
      case 'work': return WORK_DURATION;
      case 'short_break': return SHORT_BREAK_DURATION;
      case 'long_break': return LONG_BREAK_DURATION;
      default: return WORK_DURATION; // Fallback
    }
  }, []);

  // Pomodoro Timer instance
  const {
    timeRemaining: pomodoroTimeRemaining,
    isRunning: pomodoroIsRunning,
    start: startPomodoroTimer,
    pause: pausePomodoroTimer,
    reset: resetPomodoroTimerHook,
    formatTime: formatPomodoroTime,
    progress: pomodoroProgress,
  } = useTimer({
    initialDurationSeconds: getPomodoroDuration(pomodoroSessionType),
    onTimerEnd: useCallback(async () => {
      console.log(`[ProductivityTimer] Pomodoro onTimerEnd: sessionType=${pomodoroSessionType}, count=${pomodoroCount}`);
      playSound('alert');
      const endTime = new Date();
      
      let sessionTypeForLogging = pomodoroSessionType; // Capture current session type for logging
      let durationForLogging = getPomodoroDuration(pomodoroSessionType); // Capture current duration for logging
      let completedDuringSession = false;
      let newPomodoroCount = pomodoroCount; // Initialize with current count

      if (pomodoroSessionType === 'work') {
        newPomodoroCount = pomodoroCount + 1;
        setPomodoroCount(newPomodoroCount); // Update count state

        if (pomodoroCurrentTaskId) {
          const task = filteredTasks.find(t => t.id === pomodoroCurrentTaskId);
          if (task && task.status === 'completed') {
            completedDuringSession = true;
          }
        }
      }

      // Determine the NEXT session type based on the *updated* pomodoroCount (if work session)
      // or the current pomodoroSessionType (if break session)
      let nextSessionType: SessionType;
      if (sessionTypeForLogging === 'work') { // If the session that just ended was 'work'
        if (newPomodoroCount % POMODORO_CYCLES === 0) {
          nextSessionType = 'long_break';
          showSuccess('Work session complete! Time for a long break.');
        } else {
          nextSessionType = 'short_break';
          showSuccess('Work session complete! Time for a short break.');
        }
      } else { // If the session that just ended was a break
        nextSessionType = 'work';
        showSuccess('Break over! Time to focus.');
      }

      // Log the session that just finished
      if (pomodoroSessionStartTime) {
        await addFocusSession({
          session_type: sessionTypeForLogging, // Use the type of the session that just ended
          duration_minutes: durationForLogging / 60, // Use the duration of the session that just ended
          start_time: formatISO(pomodoroSessionStartTime),
          end_time: formatISO(endTime),
          task_id: pomodoroCurrentTaskId,
          completed_during_session: completedDuringSession,
        });
      }

      // Update the pomodoroSessionType state for the next cycle
      setPomodoroSessionType(nextSessionType); 

      setPomodoroSessionStartTime(null);
      setPomodoroCurrentTaskId(null);
      localStorage.removeItem('pomodoroCurrentTaskId');
      
      // Reset the timer with the duration of the *next* session type.
      // This will cause useTimer to update its internal timeRemaining.
      resetPomodoroTimerHook(getPomodoroDuration(nextSessionType)); 
    }, [pomodoroSessionType, pomodoroCount, playSound, pomodoroCurrentTaskId, filteredTasks, pomodoroSessionStartTime, addFocusSession, getPomodoroDuration]),
    onTick: useCallback((time) => {
      // console.log(`[ProductivityTimer] Pomodoro Tick: ${time}`);
    }, []),
  });

  // Custom Timer states
  const [customDuration, setCustomDuration] = useState(5 * 60); // Default to 5 minutes
  const [customSessionStartTime, setCustomSessionStartTime] = useState<Date | null>(null);

  // Custom Timer instance
  const {
    timeRemaining: customTimeRemaining,
    isRunning: customIsRunning,
    start: startCustomTimer,
    pause: pauseCustomTimer,
    reset: resetCustomTimerHook,
    formatTime: formatCustomTime,
    progress: customProgress,
  } = useTimer({
    initialDurationSeconds: customDuration,
    onTimerEnd: useCallback(async () => {
      console.log(`[ProductivityTimer] Custom onTimerEnd: customDuration=${customDuration}`);
      playSound('alert');
      const endTime = new Date();
      if (customSessionStartTime) {
        await addFocusSession({
          session_type: 'custom',
          duration_minutes: customDuration / 60,
          start_time: formatISO(customSessionStartTime),
          end_time: formatISO(endTime),
          task_id: null,
          completed_during_session: false,
        });
      }
      setCustomSessionStartTime(null);
      showSuccess('Custom timer finished!');
      resetCustomTimerHook(customDuration); // Reset the timer with its current duration
    }, [playSound, customDuration, customSessionStartTime, addFocusSession]),
  });

  const [activeTab, setActiveTab] = useState('pomodoro'); // 'pomodoro' or 'custom'

  // Persist pomodoroCurrentTaskId to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (pomodoroCurrentTaskId) {
        localStorage.setItem('pomodoroCurrentTaskId', pomodoroCurrentTaskId);
      } else {
        localStorage.removeItem('pomodoroCurrentTaskId');
      }
    }
  }, [pomodoroCurrentTaskId]);

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

  // UI Context for sidebar visibility
  useEffect(() => {
    console.log(`[ProductivityTimer] useEffect [setIsFocusModeActive]: activeTab=${activeTab}, pomodoroIsRunning=${pomodoroIsRunning}`);
    setIsFocusModeActive(activeTab === 'pomodoro' && pomodoroIsRunning);
    return () => {
      setIsFocusModeActive(false);
    };
  }, [setIsFocusModeActive, activeTab, pomodoroIsRunning]);

  const handleStartPomodoro = useCallback(() => {
    console.log(`[ProductivityTimer] handleStartPomodoro: isRunning=${pomodoroIsRunning}, timeRemaining=${pomodoroTimeRemaining}`);
    if (!pomodoroIsRunning) {
      startPomodoroTimer();
      setPomodoroSessionStartTime(new Date());
      playSound('start');
    }
  }, [pomodoroIsRunning, startPomodoroTimer, playSound, pomodoroTimeRemaining]);

  const handlePausePomodoro = useCallback(() => {
    console.log(`[ProductivityTimer] handlePausePomodoro: isRunning=${pomodoroIsRunning}`);
    pausePomodoroTimer();
    playSound('pause');
  }, [pausePomodoroTimer, playSound]);

  const handleResetPomodoro = useCallback(() => {
    console.log(`[ProductivityTimer] handleResetPomodoro: Resetting to work session.`);
    pausePomodoroTimer();
    setPomodoroSessionType('work');
    setPomodoroCount(0);
    setPomodoroCurrentTaskId(null);
    localStorage.removeItem('pomodoroCurrentTaskId');
    setPomodoroSessionStartTime(null);
    playSound('reset');
    resetPomodoroTimerHook(WORK_DURATION); // Explicitly reset to initial work duration
  }, [pausePomodoroTimer, playSound, resetPomodoroTimerHook]);

  const handleStartCustom = useCallback(() => {
    console.log(`[ProductivityTimer] handleStartCustom: isRunning=${customIsRunning}, timeRemaining=${customTimeRemaining}`);
    if (!customIsRunning && customTimeRemaining > 0) {
      startCustomTimer();
      setCustomSessionStartTime(new Date());
      playSound('start');
    }
  }, [customIsRunning, customTimeRemaining, startCustomTimer, playSound]);

  const handlePauseCustom = useCallback(() => {
    console.log(`[ProductivityTimer] handlePauseCustom: isRunning=${customIsRunning}`);
    pauseCustomTimer();
    playSound('pause');
  }, [pauseCustomTimer, playSound]);

  const handleResetCustom = useCallback(() => {
    console.log(`[ProductivityTimer] handleResetCustom: Resetting to customDuration=${customDuration}`);
    pauseCustomTimer();
    playSound('reset');
    setCustomSessionStartTime(null);
    resetCustomTimerHook(customDuration); // Explicitly reset to current custom duration
  }, [pauseCustomTimer, playSound, resetCustomTimerHook, customDuration]);

  const handleMarkTaskComplete = async (task: Task) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      await updateTask(task.id, { status: 'completed' });
      showSuccess(`Task "${task.description}" completed!`);
      // Note: pomodoroCurrentTaskId is cleared by the timer's onTimerEnd,
      // but we clear it here too if the user manually marks it complete.
      setPomodoroCurrentTaskId(null);
      localStorage.removeItem('pomodoroCurrentTaskId');
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

  const currentTimerValue = activeTab === 'pomodoro' ? pomodoroTimeRemaining : customTimeRemaining;
  const currentDurationBase = activeTab === 'pomodoro' 
    ? getPomodoroDuration(pomodoroSessionType)
    : customDuration;
  const currentIsRunning = activeTab === 'pomodoro' ? pomodoroIsRunning : customIsRunning;

  const handleCustomDurationChange = (value: string) => {
    const newDuration = parseInt(value) * 60;
    console.log(`[ProductivityTimer] handleCustomDurationChange: newDuration=${newDuration}`);
    setCustomDuration(newDuration);
    // The useEffect for customDuration will handle resetting the timer
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Productivity Timers</CardTitle>
          <p className="text-muted-foreground">
            Choose your focus method.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 min-h-[500px]">
          <Tabs value={activeTab} onValueChange={(value) => {
            console.log(`[ProductivityTimer] Tabs onValueChange: newTab=${value}`);
            setActiveTab(value as 'pomodoro' | 'custom');
            // Pause any running timer when switching tabs
            if (pomodoroIsRunning) handlePausePomodoro();
            if (customIsRunning) handlePauseCustom();
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
                {activeTab === 'pomodoro' ? formatPomodoroTime(currentTimerValue) : formatCustomTime(currentTimerValue)}
              </div>
            </div>

            <div className="flex justify-center space-x-4 mt-6">
              <Button
                size="lg"
                onClick={activeTab === 'pomodoro' ? (pomodoroIsRunning ? handlePausePomodoro : handleStartPomodoro) : (customIsRunning ? handlePauseCustom : handleStartCustom)}
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
                onClick={activeTab === 'pomodoro' ? handleResetPomodoro : handleResetCustom} 
                className="w-24"
              >
                <RotateCcw className="h-6 w-6" />
              </Button>
            </div>

            <TabsContent value="pomodoro" className="mt-6 space-y-4 min-h-[400px]">
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

            <TabsContent value="custom" className="mt-6 space-y-4 min-h-[400px]">
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
                    <SelectItem value="2">2 Minutes</SelectItem>
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