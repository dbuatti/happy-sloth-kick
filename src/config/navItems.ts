import {
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  Settings,
  BarChart3,
  Archive,
  HelpCircle,
  Code,
  UtensilsCrossed,
  Sparkles,
  Bed,
} from "lucide-react";

export const navItemsConfig = [
  {
    name: "Dashboard",
    path: "dashboard",
    icon: LayoutDashboard,
    toggleable: true,
  },
  {
    name: "Daily Tasks",
    path: "daily-tasks", // Changed from "dailyTasks"
    icon: ListTodo,
    toggleable: true,
  },
  {
    name: "Schedule",
    path: "schedule",
    icon: CalendarDays,
    toggleable: true,
  },
  {
    name: "Projects",
    path: "projects",
    icon: BarChart3,
    toggleable: true,
  },
  {
    name: "Meal Planner",
    path: "meal-planner", // Changed from "mealPlanner"
    icon: UtensilsCrossed,
    toggleable: true,
  },
  {
    name: "Resonance Goals",
    path: "resonance-goals", // Changed from "resonanceGoals"
    icon: Sparkles,
    toggleable: true,
  },
  {
    name: "Sleep",
    path: "sleep",
    icon: Bed,
    toggleable: true,
  },
  {
    name: "Dev Space",
    path: "dev-space", // Changed from "devSpace"
    icon: Code,
    toggleable: true,
  },
  {
    name: "Settings",
    path: "settings",
    icon: Settings,
    toggleable: true,
  },
  {
    name: "Analytics",
    path: "analytics",
    icon: BarChart3,
    toggleable: true,
  },
  {
    name: "Archive",
    path: "archive",
    icon: Archive,
    toggleable: true,
  },
  {
    name: "Help",
    path: "help",
    icon: HelpCircle,
    toggleable: true,
  },
];

export type NavItem = typeof navItemsConfig[number];