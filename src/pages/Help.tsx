import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Lightbulb, Bug, Mail } from 'lucide-react';

const Help: React.FC = () => {
  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6 container mx-auto max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <HelpCircle className="h-7 w-7 text-primary" /> Help & Support
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" /> Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How do I add a new task?</AccordionTrigger>
                <AccordionContent>
                  You can add a new task by clicking the floating "+" button at the bottom right of the Daily Tasks page, or by using the "Add New Task" command in the Command Palette (Cmd/Ctrl + K).
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>What is "Focus Mode"?</AccordionTrigger>
                <AccordionContent>
                  Focus Mode is designed to help you concentrate on your most important tasks. It filters your task list to only show tasks from sections you've marked as "Include in Focus Mode". You can access it from the sidebar or by clicking on the next available task in your Daily Overview.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>How can I customize my dashboard?</AccordionTrigger>
                <AccordionContent>
                  On the Dashboard page, click the "Settings" icon (gear icon) in the top right. This will open a dialog where you can toggle the visibility of built-in cards and your custom cards.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>Can I create recurring tasks?</AccordionTrigger>
                <AccordionContent>
                  Yes! When adding or editing a task, you can set its recurrence to daily, weekly, or monthly. Recurring tasks will automatically appear as "to-do" on their scheduled days.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5">
                <AccordionTrigger>How does the Project Balance Tracker work?</AccordionTrigger>
                <AccordionContent>
                  The Project Balance Tracker helps you keep track of how much attention you're giving to different projects or areas of your life. You can increment a counter for each project, aiming for a balance (e.g., 10 points per project). It helps ensure you don't neglect important areas.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Bug className="h-5 w-5 text-primary" /> Report an Issue
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground mb-4">
              If you encounter any bugs or unexpected behavior, please let us know!
            </p>
            <Button asChild>
              <a href="mailto:support@example.com?subject=Bug Report - TaskMaster" target="_blank" rel="noopener noreferrer">
                <Mail className="mr-2 h-4 w-4" /> Email Support
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Contact Us
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground mb-4">
              Have a question, suggestion, or just want to say hello? We'd love to hear from you!
            </p>
            <Button asChild>
              <a href="mailto:hello@example.com?subject=Hello from TaskMaster User" target="_blank" rel="noopener noreferrer">
                <Mail className="mr-2 h-4 w-4" /> Send us an Email
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Help;