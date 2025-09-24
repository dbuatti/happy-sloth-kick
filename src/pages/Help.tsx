import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LifeBuoy, Mail } from 'lucide-react';
import { Button } from "@/components/ui/button"; // Added import

interface HelpProps {
  isDemo?: boolean;
}

const Help: React.FC<HelpProps> = ({ isDemo = false }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-center mb-8">Help & Support</h1>

        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <LifeBuoy className="h-6 w-6 text-primary" /> FAQ
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4 text-muted-foreground">
            <p>
              <strong>Q: How do I add a new task?</strong><br />
              A: You can add a new task by clicking the floating '+' button in the bottom right corner of the Daily Tasks page, or by using the "Quick Add Task" input at the bottom of each section.
            </p>
            <p>
              <strong>Q: Can I create sub-tasks?</strong><br />
              A: Yes! When viewing a task's details, you'll find an option to add sub-tasks.
            </p>
            <p>
              <strong>Q: How do I organize my tasks into sections?</strong><br />
              A: On the Daily Tasks page, you can create new sections and drag-and-drop tasks into them. You can also assign a section when creating or editing a task.
            </p>
            <p>
              <strong>Q: What is "Focus Mode"?</strong><br />
              A: Focus Mode helps you concentrate on your most important tasks. It filters your task list to only show tasks from sections you've marked as "Include in Focus Mode" and provides tools like a Pomodoro timer and breathing exercises.
            </p>
            <p>
              <strong>Q: How does the Project Balance Tracker work?</strong><br />
              A: The Project Balance Tracker helps you ensure you're dedicating enough time to different areas of your life or work. You set a target (e.g., 10 units of effort) for each project and increment/decrement a counter as you work on them.
            </p>
            <p>
              <strong>Q: Is my data private?</strong><br />
              A: Yes, your data is stored securely using Supabase, and Row Level Security (RLS) is enabled on all tables to ensure only you can access your data.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" /> Contact Support
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4 text-muted-foreground">
            <p>
              If you encounter any bugs, have feature requests, or need further assistance, please don't hesitate to reach out!
            </p>
            <Button asChild>
              <a href="mailto:support@example.com?subject=Bug Report - TaskMaster" target="_blank" rel="noopener noreferrer">
                Report a Bug
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <LifeBuoy className="h-6 w-6 text-primary" /> General Inquiry
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4 text-muted-foreground">
            <p>
              For general questions or feedback, you can also send us an email. We'd love to hear from you!
            </p>
            <Button asChild>
              <a href="mailto:hello@example.com?subject=Hello from TaskMaster User" target="_blank" rel="noopener noreferrer">
                Send a Message
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Help;