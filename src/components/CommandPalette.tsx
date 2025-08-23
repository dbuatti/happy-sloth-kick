import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import { Task, CommandPaletteProps } from '@/types';
import { Plus, LayoutDashboard, Calendar, ListTodo, Brain, Moon, Users, Archive, Settings, LogOut, Command } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import AddTaskForm from './AddTaskForm';
import { startOfDay } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'react-hot-toast';

const CommandPalette: React.FC<CommandPaletteProps> = ({ isCommandPaletteOpen, setIsCommandPaletteOpen, currentDate }) => {
  const navigate = useNavigate();
  const { user, signOut: authSignOut } = useAuth();
  const { settings } = useSettings();

  const {
    tasks,
    categories,
    sections,
    addTask,
    addSection: createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
  } = useTasks({ userId: user?.id });

  const [search, setSearch] = useState('');
  const [isAddTaskSheetOpen, setIsAddTaskSheetOpen] = useState(false);

  const handleSignOut = async () => {
    await authSignOut();
    navigate('/login');
    toast.success('Logged out successfully!');
  };

  const menuItems = useMemo(() => [
    {
      heading: 'Navigation',
      items: [
        { label: 'Dashboard', value: 'dashboard', icon: LayoutDashboard, onSelect: () => navigate('/dashboard') },
        { label: 'Tasks', value: 'tasks', icon: ListTodo, onSelect: () => navigate('/') },
        { label: 'Schedule', value: 'schedule', icon: Calendar, onSelect: () => navigate('/schedule') },
        { label: 'Focus Mode', value: 'focus mode', icon: Brain, onSelect: () => navigate('/focus-mode') },
        { label: 'Dev Space', value: 'dev space', icon: Moon, onSelect: () => navigate('/dev-space') },
        { label: 'Sleep Tracker', value: 'sleep tracker', icon: Moon, onSelect: () => navigate('/sleep-tracker') },
        { label: 'My Hub', value: 'my hub', icon: Users, onSelect: () => navigate('/my-hub') },
        { label: 'Archive', value: 'archive', icon: Archive, onSelect: () => navigate('/archive') },
        { label: 'Settings', value: 'settings', icon: Settings, onSelect: () => navigate('/settings') },
      ],
    },
    {
      heading: 'Actions',
      items: [
        { label: 'Add New Task', value: 'add new task', icon: Plus, onSelect: () => setIsAddTaskSheetOpen(true) },
        { label: 'Logout', value: 'logout', icon: LogOut, onSelect: handleSignOut },
      ],
    },
  ], [navigate, handleSignOut]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen((open: boolean) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setIsCommandPaletteOpen]);

  return (
    <Dialog open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen}>
      <DialogContent className="p-0 max-w-lg">
        <Command>
          <CommandInput placeholder="Type a command or search..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {menuItems.map((group) => (
              <CommandGroup key={group.heading} heading={group.heading}>
                {group.items
                  .filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
                  .map((item) => (
                    <CommandItem key={item.value} value={item.value} onSelect={() => {
                      item.onSelect();
                      setIsCommandPaletteOpen(false);
                      setSearch('');
                    }}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>

      <Sheet open={isAddTaskSheetOpen} onOpenChange={setIsAddTaskSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add New Task</SheetTitle>
          </SheetHeader>
          <AddTaskForm
            onAddTask={addTask}
            categories={categories || []}
            sections={sections || []}
            currentDate={currentDate}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            showCompleted={settings?.visible_pages?.show_completed_tasks ?? false}
            onClose={() => setIsAddTaskSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </Dialog>
  );
};

export default CommandPalette;