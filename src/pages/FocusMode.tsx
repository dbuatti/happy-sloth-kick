import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/Progress";
import { Play, Pause, RefreshCcw, Brain, SkipForward } from 'lucide-react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useTasks, Task } from '@/hooks/useTasks';
import { useSound } from '@/context/SoundContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import MiniBreathingBubble from '@/components/MiniBreathingBubble'; // Import MiniBreathingBubble
import { useAuth } from '@/context/AuthContext'; // Import useAuth

const FocusMode: React.FC = () => {
  const { user } = useAuth(); // Use useAuth to get the user
  const userId = user?.id; // Get userId from useAuth

  const { playSound } = useSound();
  const { filteredTasks, updateTask, sections, allCategories, createSection, updateSection, deleteSection, updateSectionIncludeInFocusMode } = useTasks({ viewMode: 'focus' });

  const [focusDuration, setFocusDuration] = useState(25 * 60); // 25 minutes
  const [breakDuration, setBreakDuration] = useState(5 * 60); // 5 minutes
  const [longBreakDuration, setLongBreakDuration] = useState(15 * 60); // 15 minutes

  const [timeRemaining, setTimeRemaining] = useState(focusDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isFocusPhase, setIsFocusPhase] = useState(true); // true for focus, false for break
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const currentTask = useMemo(() => {
    // Find the first 'to-do' task that is not a sub-task
    return filteredTasks.find(task => task.status === 'to-do' && task.parent_task_id === null) || null;
  }, [filteredTasks]);

  useEffect(() => {
    setTimeRemaining(focusDuration);
  }, [focusDuration]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            playSound('alert'); // Alert sound for phase transition

            if (isFocusPhase) {
              setSessionsCompleted((prev: number) => prev + 1);
              const nextPhaseIsLongBreak = (sessionsCompleted + 1) % 4 === 0;
              setIsFocusPhase(false);
              setTimeRemaining(nextPhaseIsLongBreak ? longBreakDuration : breakDuration);
              playSound('complete'); // Sound for session completion
            } else {
              setIsFocusPhase(true);
              setTimeRemaining(focusDuration);
              playSound('start'); // Sound for starting new focus session
            }
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, isFocusPhase, focusDuration, breakDuration, longBreakDuration, sessionsCompleted, playSound]);

  const startTimer = useCallback(() => {
    if (timeRemaining > 0) {
      setIsRunning(true);
      playSound('start');
    }
  }, [timeRemaining, playSound]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    playSound('pause');
  }, [playSound]);

  const resetTimer = useCallback(() => {
    pauseTimer();
    setIsFocusPhase(true);
    setTimeRemaining(focusDuration);
    setSessionsCompleted(0);
    playSound('reset');
  }, [pauseTimer, focusDuration, playSound]);

  const skipPhase = useCallback(() => {
    pauseTimer();
    playSound('reset'); // Use reset sound for skipping
    if (isFocusPhase) {
      setSessionsCompleted((prev: number) => prev + 1);
      const nextPhaseIsLongBreak = (sessionsCompleted + 1) % 4 === 0;
      setIsFocusPhase(false);
      setTimeRemaining(nextPhaseIsLongBreak ? longBreakDuration : breakDuration);
    } else {
      setIsFocusPhase(true);
      setTimeRemaining(focusDuration);
    }
  }, [pauseTimer, isFocusPhase, sessionsCompleted, focusDuration, breakDuration, longBreakDuration, playSound]);

  const handleMarkTaskComplete = async (taskId: string) => {
    await updateTask(taskId, { status: 'completed' });
    playSound('success');
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressValue = (timeRemaining / (isFocusPhase ? focusDuration : (sessionsCompleted % 4 === 0 && sessionsCompleted > 0 ? longBreakDuration : breakDuration))) * 100;


  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          <Card className="w-full shadow-lg rounded-xl text-center">
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
                <Brain className="h-7 w-7 text-primary" /> Focus Mode
              </CardTitle>
              <p className="text-muted-foreground">
                Dedicated time for deep work, free from distractions.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="text-lg font-semibold text-muted-foreground">
                  {isFocusPhase ? 'Focus Session' : 'Break Time'}
                </div>
                <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
                  <Progress
                    value={progressValue}
                    className="absolute w-full h-full rounded-full bg-muted"
                    indicatorClassName={cn(
                      "transition-all duration-1000 ease-linear",
                      isFocusPhase ? "bg-primary" : "bg-accent"
                    )}
                  />
                  <div className="relative z-10 text-6xl font-bold text-primary-foreground">
                    {formatTime(timeRemaining)}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Sessions Completed: {sessionsCompleted}
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <Button
                  size="lg"
                  onClick={isRunning ? pauseTimer : startTimer}
                  className={cn(
                    "w-28 h-9 text-base",
                    isRunning ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
                  )}
                >
                  {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </Button>
                <Button size="lg" variant="outline" onClick={resetTimer} className="w-28 h-9 text-base">
                  <RefreshCcw className="h-6 w-6" /> Reset
                </Button>
                <Button size="lg" variant="outline" onClick={skipPhase} className="w-28 h-9 text-base">
                  <SkipForward className="h-6 w-6" /> Skip
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Focus Duration:</p>
                  <Select value={(focusDuration / 60).toString()} onValueChange={(val) => setFocusDuration(parseInt(val) * 60)} disabled={isRunning}>
                    <SelectTrigger className="w-full h-9 text-base">
                      <SelectValue placeholder="Focus time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 Minutes</SelectItem>
                      <SelectItem value="25">25 Minutes</SelectItem>
                      <SelectItem value="30">30 Minutes</SelectItem>
                      <SelectItem value="45">45 Minutes</SelectItem>
                      <SelectItem value="60">60 Minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Short Break:</p>
                  <Select value={(breakDuration / 60).toString()} onValueChange={(val) => setBreakDuration(parseInt(val) * 60)} disabled={isRunning}>
                    <SelectTrigger className="w-full h-9 text-base">
                      <SelectValue placeholder="Short break" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 Minutes</SelectItem>
                      <SelectItem value="10">10 Minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Long Break:</p>
                  <Select value={(longBreakDuration / 60).toString()} onValueChange={(val) => setLongBreakDuration(parseInt(val) * 60)} disabled={isRunning}>
                    <SelectTrigger className="w-full h-9 text-base">
                      <SelectValue placeholder="Long break" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 Minutes</SelectItem>
                      <SelectItem value="20">20 Minutes</SelectItem>
                      <SelectItem value="30">30 Minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <MiniBreathingBubble />
        </div>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          onUpdate={updateTask}
          onDelete={() => { /* Delete not typically in focus mode */ }}
          sections={sections}
          allCategories={allCategories}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        />
      )}
    </div>
  );
};

export default FocusMode;