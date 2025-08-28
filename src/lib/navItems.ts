import { Home, Target, LayoutGrid, CalendarClock, Leaf, Moon, Brain, LayoutDashboard, Code, ListTodo } from 'lucide-react';

export const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, toggleable: false },
  { name: 'Daily Tasks', path: '/daily-tasks', icon: ListTodo, toggleable: true, showCount: true },
  { name: 'Focus Mode', path: '/focus', icon: Target, toggleable: true },
  { name: 'Mindfulness', path: '/mindfulness', icon: Brain, toggleable: true },
  { name: 'Meditation', path: '/meditation', icon: Leaf, toggleable: true },
  { name: 'Sleep', path: '/sleep', icon: Moon, toggleable: true },
  { name: 'Project Balance', path: '/projects', icon: LayoutGrid, toggleable: true },
  { name: 'Schedule', path: '/schedule', icon: CalendarClock, toggleable: true }, // Schedule page remains
  { name: 'Dev Space', path: '/dev-space', icon: Code, toggleable: true },
  { name: 'My Hub', path: '/my-hub', icon: LayoutDashboard, toggleable: false },
];