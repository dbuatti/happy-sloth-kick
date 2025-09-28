import React from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  ListTodo,
  Calendar,
  Target,
  Briefcase,
  LinkIcon,
  Users,
  CalendarCheck,
  Bell,
  Lightbulb,
  Utensils,
  Settings,
  BookOpenText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import NavLink from '@/components/ui/nav-link';

export const Sidebar = () => {
  return (
    <div className="hidden border-r bg-sidebar md:block w-64 p-4 flex-shrink-0">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold text-sidebar-foreground">
            <BookOpenText className="h-6 w-6" />
            <span className="">My Productivity App</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start gap-2 text-sm font-medium">
            <NavLink to="/" icon={Home}>
              Dashboard
            </NavLink>
            <NavLink to="/tasks" icon={ListTodo}>
              Tasks
            </NavLink>
            <NavLink to="/habits" icon={CalendarCheck}>
              Habits
            </NavLink>
            <NavLink to="/schedule" icon={Calendar}>
              Schedule
            </NavLink>
            <NavLink to="/goals" icon={Target}>
              Goals
            </NavLink>
            <NavLink to="/projects" icon={Briefcase}>
              Projects
            </NavLink>
            <NavLink to="/quick-links" icon={LinkIcon}>
              Quick Links
            </NavLink>
            <NavLink to="/people-memory" icon={Users}>
              People Memory
            </NavLink>
            <NavLink to="/weekly-focus" icon={CalendarCheck}>
              Weekly Focus
            </NavLink>
            <NavLink to="/notifications" icon={Bell}>
              Notifications
            </NavLink>
            <NavLink to="/dev-ideas" icon={Lightbulb}>
              Dev Ideas
            </NavLink>
            <NavLink to="/meals" icon={Utensils}>
              Meals
            </NavLink>
            <NavLink to="/settings" icon={Settings}>
              Settings
            </NavLink>
          </nav>
        </div>
        <div className="mt-auto p-4">
          <Card>
            <CardHeader className="p-2 pt-0 md:p-4">
              <CardTitle>Upgrade to Pro</CardTitle>
              <CardDescription>
                Unlock all features and get unlimited access to our support team.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
              <Button size="sm" className="w-full">
                Upgrade
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};