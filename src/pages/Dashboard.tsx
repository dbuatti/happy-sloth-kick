import React from 'react';
import { useSettingsContext } from '@/context/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Plus, Target, ListTodo, CalendarDays, Moon, Code, Settings as SettingsIcon, BarChart2, Archive, Utensils, Goal } from 'lucide-react';

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId: _demoUserId }) => { // Renamed to _demoUserId
  const { settings: userSettings, isLoading: userSettingsLoading } = useSettingsContext();

  const visiblePages = userSettings?.visible_pages || {
    dailyTasks: true,
    projects: true,
    schedule: true,
    sleep: true,
    focus: true,
    devSpace: true,
    analytics: true,
    archive: true,
    mealPlanner: true,
    resonanceGoals: true,
  };

  const dashboardCards = [
    {
      id: 'dailyTasks',
      title: 'Daily Tasks',
      icon: <ListTodo className="h-5 w-5" />,
      link: '/daily-tasks',
      isVisible: visiblePages.dailyTasks,
    },
    {
      id: 'projects',
      title: userSettings?.project_tracker_title || 'Project Balance Tracker',
      icon: <Goal className="h-5 w-5" />,
      link: '/projects',
      isVisible: visiblePages.projects,
    },
    {
      id: 'schedule',
      title: 'Schedule',
      icon: <CalendarDays className="h-5 w-5" />,
      link: '/schedule',
      isVisible: visiblePages.schedule,
    },
    {
      id: 'sleep',
      title: 'Sleep Tracker',
      icon: <Moon className="h-5 w-5" />,
      link: '/sleep',
      isVisible: visiblePages.sleep,
    },
    {
      id: 'focus',
      title: 'Focus Mode',
      icon: <Target className="h-5 w-5" />,
      link: '/focus',
      isVisible: visiblePages.focus,
    },
    {
      id: 'devSpace',
      title: 'Dev Space',
      icon: <Code className="h-5 w-5" />,
      link: '/dev-space',
      isVisible: visiblePages.devSpace,
    },
    {
      id: 'mealPlanner',
      title: 'Meal Planner',
      icon: <Utensils className="h-5 w-5" />,
      link: '/meal-planner',
      isVisible: visiblePages.mealPlanner,
    },
    {
      id: 'resonanceGoals',
      title: 'Resonance Goals',
      icon: <Goal className="h-5 w-5" />,
      link: '/resonance-goals',
      isVisible: visiblePages.resonanceGoals,
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: <BarChart2 className="h-5 w-5" />,
      link: '/analytics',
      isVisible: visiblePages.analytics,
    },
    {
      id: 'archive',
      title: 'Archive',
      icon: <Archive className="h-5 w-5" />,
      link: '/archive',
      isVisible: visiblePages.archive,
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: <SettingsIcon className="h-5 w-5" />,
      link: '/settings',
      isVisible: true, // Settings should always be visible
    },
  ];

  if (userSettingsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full p-4 lg:p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboardCards.filter(card => card.isVisible).map((card) => (
          <Card key={card.id} className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent className="flex-grow flex items-end">
              <Link to={isDemo ? `/demo${card.link}` : card.link} className="w-full">
                <Button className="w-full">Go to {card.title}</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
        <Card className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed">
          <Plus className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Add Custom Card</p>
          <Button variant="outline" size="sm" className="mt-3" disabled={isDemo}>
            Create New
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;