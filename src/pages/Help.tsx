import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpPageProps } from '@/types/props';

const HelpPage: React.FC<HelpPageProps> = () => {
  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Help & Support</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300">
              Welcome to your productivity hub! Here's how to get started:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Navigate to "My Hub" to manage your daily tasks.</li>
              <li>Use the "Calendar" to schedule appointments and time-block your day.</li>
              <li>Set your "Weekly Focus" on the Dashboard to prioritize your week.</li>
              <li>Track your progress with "Project Balance Tracker".</li>
              <li>Customize your dashboard with "Custom Cards".</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300">
              If you encounter any issues, try the following:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Refresh the page.</li>
              <li>Check your internet connection.</li>
              <li>Ensure you are logged in.</li>
              <li>Contact support if the issue persists.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300">
              For further assistance, please reach out to our support team at:
            </p>
            <p className="mt-2 font-medium text-blue-600 dark:text-blue-400">support@example.com</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HelpPage;