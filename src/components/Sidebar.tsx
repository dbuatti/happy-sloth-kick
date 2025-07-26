import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Settings as SettingsIcon } from 'lucide-react'; // Import SettingsIcon
import ThemeSelector from './ThemeSelector';
import DarkModeToggle from './DarkModeToggle';

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Daily Tasks', path: '/', icon: Home },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: SettingsIcon }, // Add Settings item
  ];

  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-md h-screen flex flex-col">
      <div className="p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">TaskMaster</h1>
        <div className="flex items-center space-x-2">
          <ThemeSelector />
          <DarkModeToggle />
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} TaskMaster
        </p>
      </div>
    </div>
  );
};

export default Sidebar;