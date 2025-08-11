import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Edit, Target, ListTodo, Clock, Plus, Sparkles, Wind, Home, TreePine, UtensilsCrossed, ScanEye, Armchair, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import TaskOverviewDialog from './TaskOverviewDialog';
import { useAuth } from '@/context/AuthContext';
import { Input } from './ui/input';
import { suggestTaskDetails } from '@/integrations/supabase/api';
import { dismissToast, showError, showLoading } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import PomodoroTimer from './PomodoroTimer';

interface FocusToolsPanelProps {
  nextAvailableTask: Task | null;
  tasks: Task[];
  filteredTasks: Task[];
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onOpenDetail: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  sections: TaskSection[];
  allCategories: Category[];
  currentDate: Date;
  handleAddTask: (taskData: any) => Promise<any>;
}

const FocusToolsPanel: React.FC<FocusToolsPanelProps> = ({
  nextAvailableTask,
  tasks,
  filteredTasks,
  updateTask,
  onOpenDetail,
  onDeleteTask,
  sections,
  allCategories,
  currentDate,
  handleAddTask,
}) => {
  useAuth(); 

  const navigate = useNavigate();
  
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const [quickAddTaskDescription, setQuickAddTaskDescription] = useState('');
  const [isAddingQuickTask, setIsAddingQuickTask] = useState(false);

  const getPriorityDotColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-priority-urgent';
      case 'high': return 'bg-priority-high';
      case 'medium': return 'bg-priority-medium';
      case 'low': return 'bg-priority-low';
      default: return 'bg-gray-500';
    }
  };

  const handleMarkComplete = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
    }
  };

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setIsTaskOverviewOpen(false);
    onOpenDetail(task);
  };

  const upcomingTasks = useMemo(() => {
    if (!nextAvailableTask) return [];
    const nextTaskAndSubtasksIds = new Set([
      nextAvailableTask.id,
      ...tasks.filter(t => t.parent_task_id === nextAvailableTask.id).map(t => t.id)
    ]);
    return filteredTasks
      .filter(t => !nextTaskAndSubtasksIds.has(t.id) && t.parent_task_id === null && t.status === 'to-do')
      .slice(0, 5);
  }, [nextAvailableTask, filteredTasks, tasks]);

  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTaskDescription.trim()) {
      showError('Task description cannot be empty.');
      return;
    }
    setIsAddingQuickTask(true);
    const loadingToastId = showLoading('Getting AI suggestions...');
    const categoriesForAI = allCategories.map(cat => ({ id: cat.id, name: cat.name }));
    const suggestions = await suggestTaskDetails(quickAddTaskDescription.trim(), categoriesForAI, currentDate);
    dismissToast(loadingToastId);
    if (!suggestions) {
      showError('Failed to get AI suggestions. Please try again.');
      setIsAddingQuickTask(false);
      return;
    }
    const suggestedCategoryId = allCategories.find(cat => cat.name.toLowerCase() === suggestions.category.toLowerCase())?.id || allCategories.find(cat => cat.name.toLowerCase() === 'general')?.id || allCategories[0]?.id || '';
    const suggestedSectionId = sections.find(sec => sec.name.toLowerCase() === suggestions.section?.toLowerCase())?.id || null;
    const success = await handleAddTask({
      description: suggestions.cleanedDescription,
      category: suggestedCategoryId,
      priority: suggestions.priority as Task['priority'],
      due_date: suggestions.dueDate,
      notes: suggestions.notes,
      remind_at: suggestions.remindAt,
      section_id: suggestedSectionId,
      recurring_type: 'none',
      parent_task_id: null,
      link: suggestions.link,
    });
    if (success) {
      setQuickAddTaskDescription('');
    }
    setIsAddingQuickTask(false);
  };

  const mindfulnessTools = [
    { name: 'Breathing', icon: Wind, path: '/mindfulness/breathing-bubble' },
    { name: 'Body Scan', icon: ScanEye, path: '/mindfulness/body-scan' },
    { name: 'PMR', icon: Armchair, path: '/mindfulness/pmr' },
    { name: 'Imagery', icon: TreePine, path: '/mindfulness/guided-imagery' },
    { name: 'Eating', icon: UtensilsCrossed, path: '/mindfulness/mindful-eating' },
    { name: 'Sensory', icon: Home, path: '/mindfulness/sensory-tool' },
    { name: 'Thought Diffusion', icon: MessageSquare, path: '/mindfulness/thought-diffusion' },
  ];

  return (
    <div className="h-full flex flex-col space-y-3">
      <Card className="w-full shadow-lg rounded-xl text-center flex-shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Focus Timer
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Dedicated time for deep work.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 py-4">
          <PomodoroTimer />
        </CardContent>
      </Card>

      <Card className="w-full shadow-lg rounded-xl flex-shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Quick Add Task
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleQuickAddTask}>
            <div className="flex items-center gap-2">
              <Input
                placeholder='Add a task (AI-powered)'
                value={quickAddTaskDescription}
                onChange={(e) => setQuickAddTaskDescription(e.target.value)}
                className="flex-1 h-9 text-base"
                disabled={isAddingQuickTask}
              />
              <Button type="submit" className="whitespace-nowrap h-9 text-base" disabled={isAddingQuickTask || !quickAddTaskDescription.trim()}>
                {isAddingQuickTask ? <span className="animate-spin h-4 w-4 border-b-2 border-primary rounded-full" /> : <Sparkles className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="w-full shadow-lg rounded-xl flex-grow flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Next Up
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-between pt-0">
          {nextAvailableTask ? (
            <div className="flex-grow flex flex-col justify-center items-center text-center space-y-3 p-2">
              <div className={cn("w-3 h-3 rounded-full", getPriorityDotColor(nextAvailableTask.priority))} />
              <h3 className="text-lg font-semibold leading-tight text-foreground line-clamp-3">
                {nextAvailableTask.description}
              </h3>
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleMarkComplete} className="h-8 text-base">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Done
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleOpenTaskOverview(nextAvailableTask)} className="h-8 text-base">
                  <Edit className="mr-2 h-4 w-4" /> Details
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center text-center text-muted-foreground text-sm py-4">
              No tasks currently available.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="w-full shadow-lg rounded-xl flex-shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" /> Upcoming
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {upcomingTasks.length > 0 ? (
            <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {upcomingTasks.map(task => (
                <li key={task.id} className="flex items-center space-x-2">
                  <div className={cn("w-2 h-2 rounded-full", getPriorityDotColor(task.priority))} />
                  <span className="text-sm text-foreground truncate flex-grow">{task.description}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => handleOpenTaskOverview(task)}
                    aria-label="View task details"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-2">
              No upcoming tasks.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="w-full shadow-lg rounded-xl flex-shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Quick Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-2">
            {mindfulnessTools.map(tool => {
              const Icon = tool.icon;
              return (
                <Button
                  key={tool.name}
                  variant="outline"
                  className="h-10 text-base flex items-center justify-center gap-2"
                  onClick={() => navigate(tool.path)}
                >
                  <Icon className="h-4 w-4" /> {tool.name}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={onDeleteTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={tasks}
        />
      )}
    </div>
  );
};

export default FocusToolsPanel;