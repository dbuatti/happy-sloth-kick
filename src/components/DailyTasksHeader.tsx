import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Task, UpdateTaskData, TaskSection, NewTaskSectionData, UpdateTaskSectionData, Category, NewCategoryData, UpdateCategoryData } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { getPriorityDotColor } from '@/utils/taskHelpers';
import { CheckCircle2, ListTodo, PlusCircle, X } from 'lucide-react';
import { useSound } from '@/context/SoundContext';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
// import { useDoToday } from '@/hooks/useDoToday'; // Removed unused import

interface DailyTasksHeaderProps {
  currentDate: Date;
  nextAvailableTask: Task | null;
  updateTask: (taskId: string, updates: UpdateTaskData) => Promise<Task | null>;
  onOpenOverview: (task: Task) => void;
  onAddTask: () => void;
  sections: TaskSection[];
  allCategories: Category[];
  createSection: (newSection: NewTaskSectionData) => Promise<TaskSection | null>;
  updateSection: (sectionId: string, updates: UpdateTaskSectionData) => Promise<TaskSection | null>;
  deleteSection: (sectionId: string) => Promise<boolean>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection | null>;
  createCategory: (newCategory: NewCategoryData) => Promise<Category | null>;
  updateCategory: (categoryId: string, updates: UpdateCategoryData) => Promise<Category | null>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  allTasks: Task[]; // Pass all tasks for subtask filtering in overview
  doTodayOffIds: string[];
  toggleDoToday: (taskId: string, isOff: boolean) => Promise<boolean>;
  toggleAllDoToday: (tasks: Task[], turnOff: boolean) => Promise<void>;
  dailyProgress: { completed: number; total: number };
}

const DailyTasksHeader: React.FC<DailyTasksHeaderProps> = ({
  currentDate,
  nextAvailableTask,
  updateTask,
  onOpenOverview,
  onAddTask,
  sections,
  // allCategories, // Removed unused prop
  // createSection, // Removed unused prop
  // updateSection, // Removed unused prop
  // deleteSection, // Removed unused prop
  // updateSectionIncludeInFocusMode, // Removed unused prop
  // createCategory, // Removed unused prop
  // updateCategory, // Removed unused prop
  // deleteCategory, // Removed unused prop
  allTasks,
  // doTodayOffIds, // Removed unused prop
  // toggleDoToday, // Removed unused prop
  toggleAllDoToday,
  dailyProgress,
}) => {
  const { playSound } = useSound();
  const { isLoading: countLoading } = useDailyTaskCount({ currentDate }); // Removed completedCount, totalCount as dailyProgress is used

  const handleMarkComplete = async (task: Task) => {
    await updateTask(task.id, { status: 'completed' });
    playSound('complete');
  };

  const handleMarkToDo = async (task: Task) => {
    await updateTask(task.id, { status: 'to-do' });
    playSound('success');
  };

  const getSectionName = (sectionId: string | null | undefined) => {
    if (!sectionId) return 'No Section';
    return sections.find(s => s.id === sectionId)?.name || 'Unknown Section';
  };

  return (
    <Card className="w-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg rounded-xl overflow-hidden">
      <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-lg font-semibold opacity-90 mb-1">Your Daily Focus</h2>
          {nextAvailableTask ? (
            <div className="flex flex-col items-center md:items-start gap-3">
              <div className="flex items-center justify-center gap-3">
                <div className={cn("w-5 h-5 rounded-full flex-shrink-0", getPriorityDotColor(nextAvailableTask.priority || 'medium'))} />
                <p className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight line-clamp-2">
                  {nextAvailableTask.description}
                </p>
              </div>
              <p className="text-sm opacity-90">Section: {getSectionName(nextAvailableTask.section_id)}</p>
              <div className="flex gap-3 mt-4">
                {nextAvailableTask.status !== 'completed' ? (
                  <Button
                    onClick={() => handleMarkComplete(nextAvailableTask)}
                    className="bg-white text-blue-600 hover:bg-gray-100"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Complete
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => handleMarkToDo(nextAvailableTask)}
                    className="bg-white text-blue-600 hover:bg-gray-100"
                  >
                    <ListTodo className="mr-2 h-4 w-4" /> Mark To-Do
                  </Button>
                )}
                <Button variant="outline" onClick={() => onOpenOverview(nextAvailableTask)} className="bg-white text-blue-600 hover:bg-gray-100">
                  Details
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-xl font-bold">No tasks for today!</p>
              <Button onClick={onAddTask} className="mt-4 bg-white text-blue-600 hover:bg-gray-100">
                <PlusCircle className="mr-2 h-4 w-4" /> Add a Task
              </Button>
            </div>
          )}
        </div>

        <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-4 mt-6 md:mt-0">
          <div className="text-right">
            <p className="text-sm opacity-90">Tasks Completed</p>
            {countLoading ? (
              <div className="h-8 w-16 bg-white/20 rounded animate-pulse"></div>
            ) : (
              <p className="text-4xl font-bold">{dailyProgress.completed} / {dailyProgress.total}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => toggleAllDoToday(allTasks.filter(t => t.status === 'to-do'), true)}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <X className="mr-2 h-4 w-4" /> Move All Off Today
            </Button>
            <Button
              variant="outline"
              onClick={() => toggleAllDoToday(allTasks.filter(t => t.status === 'to-do'), false)}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <ListTodo className="mr-2 h-4 w-4" /> Move All On Today
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyTasksHeader;