import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Sidebar from "@/components/Sidebar";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Lightbulb, Keyboard, Palette, Settings, FolderOpen, Calendar, BellRing, StickyNote, CheckCircle2, BarChart3, User, LogOut, Search, Plus, ChevronLeft, ChevronRight, Edit } from 'lucide-react'; // Added Edit
import { themes } from '@/lib/themes';

const Help = () => {
  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-grow p-4 flex items-center justify-center">
          <Card className="w-full max-w-4xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center">TaskMaster Help Center</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Lightbulb className="h-6 w-6 text-primary" /> Core Task Functionality
                </h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Adding Tasks:</strong> Use the <kbd>Cmd/Ctrl + K</kbd> shortcut to open the Command Palette, then select "Add New Task".</li>
                  <li><strong>Editing Tasks:</strong> Click the <Edit className="inline-block h-4 w-4" /> icon on a task or use the dropdown menu to edit its details.</li>
                  <li><strong>Deleting Tasks:</strong> Tasks can be deleted individually via the dropdown menu or in bulk using the "Bulk Actions" bar.</li>
                  <li><strong>Task Status:</strong> Mark tasks as 'To-Do', 'Completed', 'Skipped', or 'Archived' using the checkbox or the task's dropdown menu.</li>
                  <li><strong>Recurring Tasks:</strong> Set tasks to repeat 'Daily', 'Weekly', or 'Monthly' when adding or editing. Daily recurring tasks will automatically appear on subsequent days.</li>
                  <li><strong>Due Dates & Reminders:</strong> Assign specific due dates and set reminders with a time for important tasks.</li>
                  <li><strong>Notes:</strong> Add detailed notes to any task for extra context.</li>
                  <li><strong>Categories:</strong> Organize tasks into custom categories (e.g., Work, Personal, Shopping) with distinct colors. Manage categories via the task edit form.</li>
                  <li><strong>Priorities:</strong> Assign 'Low', 'Medium', 'High', or 'Urgent' priorities to tasks.</li>
                  <li><strong>Sections:</strong> Group tasks into custom sections (e.g., Today, This Week, Backlog) for better organization. Manage sections via the <Settings className="inline-block h-4 w-4" /> icon next to "Your Tasks".</li>
                  <li><strong>Bulk Actions:</strong> Select multiple tasks using their checkboxes to perform actions like 'Complete', 'Archive', 'Delete', or change 'Priority' for all selected tasks at once.</li>
                </ul>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Keyboard className="h-6 w-6 text-primary" /> Keyboard Shortcuts
                </h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><kbd>Cmd/Ctrl + K</kbd>: Open the **Command Palette** for quick access to all actions.</li>
                  <li><kbd>N</kbd>: (Within Command Palette) Quickly open the "Add New Task" form.</li>
                  <li><kbd>ArrowLeft</kbd>: Navigate to the **Previous Day** in the Daily Tasks view.</li>
                  <li><kbd>ArrowRight</kbd>: Navigate to the **Next Day** in the Daily Tasks view.</li>
                  <li><kbd>F</kbd>: Focus on the **Search Tasks** input field.</li>
                </ul>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Palette className="h-6 w-6 text-primary" /> Customization & Themes
                </h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Dark Mode Toggle:</strong> Switch between light and dark modes using the <span className="inline-flex items-center"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg> / <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg></span> icon in the sidebar.</li>
                  <li><strong>Color Themes:</strong> Choose from a variety of pre-defined color themes (e.g., ADHD-Friendly, Calm Mist, Cosmic Dusk) using the <Palette className="inline-block h-4 w-4" /> icon in the sidebar.</li>
                  <li><strong>Responsive Design:</strong> The app is designed to adapt seamlessly to different screen sizes, from mobile to desktop.</li>
                </ul>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Lightbulb className="h-6 w-6 text-primary" /> Advanced Features
                </h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>AI-Powered Suggestions:</strong> When adding a new task, the app intelligently suggests a category and priority based on your description.</li>
                  <li><strong>Daily Progress:</strong> The "Today's Progress" card on the Daily Tasks page provides a quick overview of your completed tasks for the day.</li>
                  <li><strong>Visual Urgency Cues:</strong> Tasks that are overdue are highlighted with a red border, and tasks due today have an orange border, making prioritization intuitive.</li>
                  <li><strong>Drag-and-Drop Reordering:</strong> Easily reorder tasks within sections or move them between sections using intuitive drag-and-drop functionality. You can also reorder sections themselves.</li>
                  <li><strong>Task Completion Animation:</strong> A subtle animation plays when you mark a task as complete, providing satisfying visual feedback.</li>
                  <li><strong>Analytics Page:</strong> Visit the <BarChart3 className="inline-block h-4 w-4" /> Analytics page to view your task completion trends, category breakdown, and priority distribution over time.</li>
                </ul>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <User className="h-6 w-6 text-primary" /> Account & Settings
                </h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Authentication:</strong> Sign in or create an account using email/password or Google authentication.</li>
                  <li><strong>Profile Settings:</strong> Update your first and last name on the <Settings className="inline-block h-4 w-4" /> Settings page.</li>
                  <li><strong>Sign Out:</strong> Securely log out of your account from the Settings page.</li>
                </ul>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Lightbulb className="h-6 w-6 text-primary" /> Navigation
                </h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Sidebar:</strong> Use the navigation links on the left to switch between Daily Tasks, Analytics, Settings, and this Help page.</li>
                  <li><strong>Date Navigator:</strong> On the Daily Tasks page, use the <ChevronLeft className="inline-block h-4 w-4" /> and <ChevronRight className="inline-block h-4 w-4" /> buttons to navigate between days.</li>
                </ul>
              </section>

            </CardContent>
          </Card>
        </main>
        <footer className="p-4">
          <MadeWithDyad />
        </footer>
      </div>
    </div>
  );
};

export default Help;