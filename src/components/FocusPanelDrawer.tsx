"use client";

import React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import FocusPanel from './FocusPanel'; // Import the new FocusPanel component
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks'; // Import types

interface FocusPanelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  allTasks: Task[];
  filteredTasks: Task[];
  loading: boolean; // Added loading prop
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onOpenDetail: (task: Task) => void;
  onDeleteTask: (taskId: string) => Promise<boolean | undefined>;
  sections: TaskSection[];
  allCategories: Category[];
  handleAddTask: (taskData: NewTaskData) => Promise<any>;
  currentDate: Date;
  setFocusTask: (taskId: string | null) => Promise<void>;
  doTodayOffIds: Set<string>;
  toggleDoToday: (task: Task) => Promise<void>;
  archiveAllCompletedTasks: () => Promise<void>;
  toggleAllDoToday: () => Promise<void>;
  markAllTasksAsSkipped?: () => Promise<void>;
  isDemo?: boolean;
}

const FocusPanelDrawer: React.FC<FocusPanelDrawerProps> = ({
  isOpen,
  onClose,
  loading, // Destructure loading
  ...focusPanelProps // Collect all other props to pass to FocusPanel
}) => {
  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[90%] mt-24 fixed bottom-0 left-0 right-0">
        <DrawerHeader className="text-left">
          <DrawerTitle>Focus Mode</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 overflow-y-auto">
          <FocusPanel {...focusPanelProps} loading={loading} /> {/* Pass loading prop */}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default FocusPanelDrawer;