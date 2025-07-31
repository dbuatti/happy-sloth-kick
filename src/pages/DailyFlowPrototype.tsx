import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useSleepRecords } from '@/hooks/useSleepRecords';
import { useWorkHours } from '@/hooks/useWorkHours';
import DailyStreak from '@/components/DailyStreak';
import NextTaskCard from '@/components/NextTaskCard';
import WorryJournal from '@/components/WorryJournal';
import GratitudeJournal from '@/components/GratitudeJournal';
import MiniBreathingBubble from '@/components/MiniBreathingBubble';
import SensoryTool from '@/components/SensoryTool';
import Meditation from '@/pages/Meditation'; // Using the full page for now
import ProgressiveMuscleRelaxation from '@/components/ProgressiveMuscleRelaxation';
import { format, isSameDay } from 'date-fns';
import { Lightbulb, Sun, Briefcase, Coffee, Moon, Bed, Sparkles } from 'lucide-react';

type TimeOfDay = 'morning' | 'work' | 'break' | 'evening' | 'night';

const DailyFlowPrototype: React.FC = () => {
  const [currentTimeOfDay, setCurrentTimeOfDay] = useState<TimeOfDay>('morning');
  const currentDate = new Date(); // For task-related components

  // Fetch data using existing hooks
  const { filteredTasks, loading: tasksLoading, nextAvailableTask, updateTask, deleteTask, userId } = useTasks({ currentDate });
  const { projects, loading: projectsLoading, sectionTitle: projectTrackerTitle, leastWorkedOnProject } = useProjects();
  const { sleepRecord, loading: sleepLoading } = useSleepRecords({ selectedDate: currentDate });
  const { workHours: singleDayWorkHours, loading: workHoursLoading } = useWorkHours({ date: currentDate });

  const handleMarkTaskComplete = async (taskId: string) => {
    await updateTask(taskId, { status: 'completed' });
  };

  const handleEditNextTask = (task: any) => {
    // For prototype, just log or show a simple alert
    alert(`Editing task: ${task?.description || 'No task selected'}`);
  };

  const renderContent = useMemo(() => {
    switch (currentTimeOfDay) {
      case 'morning':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sun className="h-6 w-6 text-yellow-500" /> Good Morning!
            </h2>
            <p className="text-muted-foreground">Start your day with intention and gratitude.</p>
            <DailyStreak tasks={filteredTasks} currentDate={currentDate} />
            <NextTaskCard
              task={nextAvailableTask}
              onMarkComplete={handleMarkTaskComplete}
              onEditTask={handleEditNextTask}
              currentDate={currentDate}
              loading={tasksLoading}
            />
            <GratitudeJournal />
            <MiniBreathingBubble />
          </div>
        );
      case 'work':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-blue-500" /> Focus & Productivity
            </h2>
            <p className="text-muted-foreground">Dive into your tasks and balance your projects.</p>
            <NextTaskCard
              task={nextAvailableTask}
              onMarkComplete={handleMarkTaskComplete}
              onEditTask={handleEditNextTask}
              currentDate={currentDate}
              loading={tasksLoading}
            />
            <MiniBreathingBubble />
            <Card className="w-full shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-500" /> Project Focus
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {projectsLoading ? (
                  <p>Loading projects...</p>
                ) : leastWorkedOnProject ? (
                  <p className="text-muted-foreground">
                    Consider focusing on: <span className="font-semibold">{leastWorkedOnProject.name}</span> (Current count: {leastWorkedOnProject.current_count}/10)
                  </p>
                ) : (
                  <p className="text-muted-foreground">No projects to balance yet.</p>
                )}
                <Button className="mt-4 w-full" onClick={() => alert('Navigating to Project Balance Tracker...')}>Go to Projects</Button>
              </CardContent>
            </Card>
            <WorryJournal />
          </div>
        );
      case 'break':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Coffee className="h-6 w-6 text-orange-500" /> Recharge & Reset
            </h2>
            <p className="text-muted-foreground">Take a moment to refresh your mind and body.</p>
            <MiniBreathingBubble />
            <SensoryTool />
            <Card className="w-full shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-green-500" /> Quick Meditation
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground">A short guided meditation to clear your head.</p>
                <Button className="mt-4 w-full" onClick={() => alert('Starting a 5-minute meditation...')}>Start 5-min Meditation</Button>
              </CardContent>
            </Card>
          </div>
        );
      case 'evening':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Moon className="h-6 w-6 text-purple-500" /> Wind Down & Reflect
            </h2>
            <p className="text-muted-foreground">Prepare for a restful night and clear your mind.</p>
            <WorryJournal />
            <GratitudeJournal />
            <Card className="w-full shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-500" /> Tomorrow's Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground">Review and plan for the day ahead.</p>
                <Button className="mt-4 w-full" onClick={() => alert('Navigating to tomorrow\'s tasks...')}>View Tomorrow</Button>
              </CardContent>
            </Card>
          </div>
        );
      case 'night':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Bed className="h-6 w-6 text-indigo-500" /> Rest & Recovery
            </h2>
            <p className="text-muted-foreground">Log your sleep and prepare for deep rest.</p>
            <Card className="w-full shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Bed className="h-5 w-5 text-indigo-500" /> Sleep Log
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {sleepLoading ? (
                  <p>Loading sleep record...</p>
                ) : sleepRecord ? (
                  <p className="text-muted-foreground">
                    Last recorded sleep: {sleepRecord.bed_time ? format(new Date(`2000-01-01T${sleepRecord.bed_time}`), 'h:mm a') : 'N/A'} - {sleepRecord.wake_up_time ? format(new Date(`2000-01-01T${sleepRecord.wake_up_time}`), 'h:mm a') : 'N/A'}
                  </p>
                ) : (
                  <p className="text-muted-foreground">No sleep record for today.</p>
                )}
                <Button className="mt-4 w-full" onClick={() => alert('Navigating to Sleep Tracker...')}>Log Sleep</Button>
              </CardContent>
            </Card>
            <ProgressiveMuscleRelaxation />
            <Meditation /> {/* Full meditation page for deep relaxation */}
          </div>
        );
      default:
        return <p className="text-muted-foreground">Select a time of day to see the adaptive flow.</p>;
    }
  }, [currentTimeOfDay, filteredTasks, tasksLoading, nextAvailableTask, currentDate, projectsLoading, leastWorkedOnProject, sleepLoading, sleepRecord]);

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-4xl mx-auto shadow-lg p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <Sparkles className="h-7 w-7 text-primary" /> Adaptive Daily Flow Prototype
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center">
              Experience how your dashboard can adapt to your daily rhythm.
            </p>
          </CardHeader>
          <CardContent className="pt-0 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <label htmlFor="time-of-day-selector" className="text-lg font-medium">Simulate Time of Day:</label>
              <Select value={currentTimeOfDay} onValueChange={(value: TimeOfDay) => setCurrentTimeOfDay(value)}>
                <SelectTrigger id="time-of-day-selector" className="w-[180px]">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="work">Work Hours</SelectItem>
                  <SelectItem value="break">Break Time</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-4 bg-background">
              {renderContent}
            </div>
          </CardContent>
        </Card>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default DailyFlowPrototype;