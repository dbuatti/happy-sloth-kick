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
import { format, isSameDay, addDays } from 'date-fns'; // Added addDays
import { Lightbulb, Sun, Briefcase, Coffee, Moon, Bed, Sparkles, Brain } from 'lucide-react'; // Added Brain
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { cn } from '@/lib/utils'; // Import cn for conditional classes

type TimeOfDay = 'morning' | 'work' | 'break' | 'evening' | 'night';

const DailyFlowPrototype: React.FC = () => {
  const navigate = useNavigate(); // Initialize useNavigate
  const [currentTimeOfDay, setCurrentTimeOfDay] = useState<TimeOfDay>('morning');
  const currentDate = new Date(); // For task-related components

  // State to manage AI Nudge visibility
  const [showMorningNudge, setShowMorningNudge] = useState(true);
  const [showWorkNudge, setShowWorkNudge] = useState(true);
  const [showBreakNudge, setShowBreakNudge] = useState(true);
  const [showEveningNudge, setShowEveningNudge] = useState(true);
  const [showNightNudge, setShowNightNudge] = useState(true);

  // Reset nudge visibility when time of day changes
  React.useEffect(() => {
    setShowMorningNudge(true);
    setShowWorkNudge(true);
    setShowBreakNudge(true);
    setShowEveningNudge(true);
    setShowNightNudge(true);
  }, [currentTimeOfDay]);

  // Fetch data using existing hooks
  const { filteredTasks, loading: tasksLoading, nextAvailableTask, updateTask, deleteTask, userId, setCurrentDate: setTaskCurrentDate } = useTasks({ currentDate });
  const { projects, loading: projectsLoading, sectionTitle: projectTrackerTitle } = useProjects();
  const { sleepRecord, loading: sleepLoading } = useSleepRecords({ selectedDate: currentDate });
  const { workHours: singleDayWorkHours, loading: workHoursLoading } = useWorkHours({ date: currentDate });

  const handleMarkTaskComplete = async (taskId: string) => {
    await updateTask(taskId, { status: 'completed' });
  };

  // This function will now navigate to the main page when "Add New Task" is clicked
  // or show an alert for editing existing tasks (for prototype simplicity)
  const handleEditNextTask = (task: any) => {
    if (!task) {
      // If no task, navigate to main page to allow adding a new task
      navigate('/');
    } else {
      // For prototype, just log or show a simple alert for editing existing tasks
      alert(`Editing task: ${task?.description || 'No task selected'}`);
    }
  };

  const leastWorkedOnProject = useMemo(() => {
    if (projects.length === 0) return null;
    return projects.reduce((prev, current) =>
      prev.current_count <= current.current_count ? prev : current
    );
  }, [projects]);

  const renderContent = useMemo(() => {
    switch (currentTimeOfDay) {
      case 'morning':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sun className="h-6 w-6 text-yellow-500" /> Good Morning!
            </h2>
            <p className="text-muted-foreground">Start your day with intention and gratitude.</p>
            {showMorningNudge && (
              <Card className="w-full shadow-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 animate-in fade-in duration-500">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <p className="text-sm text-blue-800 dark:text-blue-200 flex-grow">
                    **AI Nudge:** "Let's set a positive tone! What are three things you're grateful for today?"
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setShowMorningNudge(false)} className="flex-shrink-0 mt-2 sm:mt-0">Got it!</Button>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <DailyStreak tasks={filteredTasks} currentDate={currentDate} />
              </div>
              <div className="md:col-span-2">
                <NextTaskCard
                  task={nextAvailableTask}
                  onMarkComplete={handleMarkTaskComplete}
                  onEditTask={handleEditNextTask}
                  currentDate={currentDate}
                  loading={tasksLoading}
                />
              </div>
              <GratitudeJournal />
              <MiniBreathingBubble />
            </div>
          </div>
        );
      case 'work':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-blue-500" /> Focus & Productivity
            </h2>
            <p className="text-muted-foreground">Dive into your tasks and balance your projects.</p>
            {showWorkNudge && (
              <Card className="w-full shadow-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 animate-in fade-in duration-500">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Brain className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-sm text-green-800 dark:text-green-200 flex-grow">
                    **AI Nudge:** "Ready for deep work? Consider starting a focus session for your next task!"
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setShowWorkNudge(false)} className="flex-shrink-0 mt-2 sm:mt-0">Got it!</Button>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <NextTaskCard
                  task={nextAvailableTask}
                  onMarkComplete={handleMarkTaskComplete}
                  onEditTask={handleEditNextTask}
                  currentDate={currentDate}
                  loading={tasksLoading}
                />
              </div>
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
                  <Button className="mt-4 w-full" onClick={() => navigate('/projects')}>Go to Projects</Button>
                </CardContent>
              </Card>
              <WorryJournal />
            </div>
          </div>
        );
      case 'break':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Coffee className="h-6 w-6 text-orange-500" /> Recharge & Reset
            </h2>
            <p className="text-muted-foreground">Take a moment to refresh your mind and body.</p>
            {showBreakNudge && (
              <Card className="w-full shadow-lg bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 animate-in fade-in duration-500">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <p className="text-sm text-purple-800 dark:text-purple-200 flex-grow">
                    **AI Nudge:** "Feeling overwhelmed? Try the 5-4-3-2-1 Sensory Tool to ground yourself."
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setShowBreakNudge(false)} className="flex-shrink-0 mt-2 sm:mt-0">Got it!</Button>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MiniBreathingBubble />
              <SensoryTool />
              <Card className="w-full shadow-lg md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-green-500" /> Quick Meditation
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground">A short guided meditation to clear your head.</p>
                  <Button className="mt-4 w-full" onClick={() => navigate('/meditation')}>Start 5-min Meditation</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 'evening':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Moon className="h-6 w-6 text-purple-500" /> Wind Down & Reflect
            </h2>
            <p className="text-muted-foreground">Prepare for a restful night and clear your mind.</p>
            {showEveningNudge && (
              <Card className="w-full shadow-lg bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 animate-in fade-in duration-500">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Brain className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 flex-grow">
                    **AI Nudge:** "Any lingering worries? Jot them down in your Worry Journal before bed."
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setShowEveningNudge(false)} className="flex-shrink-0 mt-2 sm:mt-0">Got it!</Button>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <WorryJournal />
              <GratitudeJournal />
              <Card className="w-full shadow-lg md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-blue-500" /> Tomorrow's Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground">Review and plan for the day ahead.</p>
                  <Button className="mt-4 w-full" onClick={() => {
                    setTaskCurrentDate(addDays(currentDate, 1));
                    navigate('/');
                  }}>View Tomorrow</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 'night':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Bed className="h-6 w-6 text-indigo-500" /> Rest & Recovery
            </h2>
            <p className="text-muted-foreground">Log your sleep and prepare for deep rest.</p>
            {showNightNudge && (
              <Card className="w-full shadow-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 animate-in fade-in duration-500">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Brain className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-800 dark:text-red-200 flex-grow">
                    **AI Nudge:** "Ensure a good night's rest. Have you logged your sleep yet?"
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setShowNightNudge(false)} className="flex-shrink-0 mt-2 sm:mt-0">Got it!</Button>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <Button className="mt-4 w-full" onClick={() => navigate('/sleep')}>Log Sleep</Button>
                </CardContent>
              </Card>
              <ProgressiveMuscleRelaxation />
              <div className="md:col-span-2">
                <Meditation /> {/* Full meditation page for deep relaxation */}
              </div>
            </div>
          </div>
        );
      default:
        return <p className="text-muted-foreground">Select a time of day to see the adaptive flow.</p>;
    }
  }, [currentTimeOfDay, filteredTasks, tasksLoading, nextAvailableTask, currentDate, projectsLoading, leastWorkedOnProject, sleepLoading, sleepRecord, navigate, setTaskCurrentDate, showMorningNudge, showWorkNudge, showBreakNudge, showEveningNudge, showNightNudge]);

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow py-8 flex justify-center"> {/* Increased vertical padding */}
        <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-xl p-6"> {/* Updated card styling */}
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