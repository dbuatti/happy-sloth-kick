import React from 'react';
import { HelpPageProps } from '@/types/props';

const HelpPage: React.FC<HelpPageProps> = () => {
  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Help & Support</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-2">Getting Started</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Welcome to your productivity app! Here's how to get started:
          </p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-gray-700 dark:text-gray-300">
            <li>**Dashboard:** Your central hub for an overview of your day, next tasks, projects, and custom cards.</li>
            <li>**My Hub:** Manage all your tasks, sections, and categories. Use filters to organize your view.</li>
            <li>**Calendar:** Visualize your tasks and appointments in a daily or weekly view.</li>
            <li>**Archive:** Find your completed and archived tasks here.</li>
            <li>**Settings:** Customize your app experience, including project tracker title and work hours.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Key Features</h2>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-gray-700 dark:text-gray-300">
            <li>**Task Management:** Create, update, delete, and reorder tasks. Add subtasks, priorities, due dates, and categories.</li>
            <li>**Sections & Categories:** Organize your tasks into custom sections (e.g., "Today's Priorities", "This Week") and categories (e.g., "Work", "Personal").</li>
            <li>**Focus Mode:** Dedicate uninterrupted time to a single task.</li>
            <li>**AI Suggestions:** Use the quick add task input to get AI-powered suggestions for task details.</li>
            <li>**Project Tracker:** Keep an eye on your ongoing projects with customizable counters.</li>
            <li>**Quick Links:** Store and access your most important links directly from the dashboard.</li>
            <li>**Journaling:** Maintain gratitude and worry journals to track your mental well-being.</li>
            <li>**Sleep Tracker:** Log your sleep patterns to understand and improve your sleep hygiene.</li>
            <li>**People Memory:** Keep notes on important people in your life.</li>
            <li>**Custom Dashboard Cards:** Personalize your dashboard with custom information cards.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Troubleshooting</h2>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-gray-700 dark:text-gray-300">
            <li>**Data Not Loading:** Ensure you are logged in. If the issue persists, try refreshing the page or restarting the app.</li>
            <li>**Errors:** If you encounter an error, please note down the steps that led to it and contact support.</li>
            <li>**Performance Issues:** For slow performance, try clearing your browser cache or using a different browser.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Contact Support</h2>
          <p className="text-gray-700 dark:text-gray-300">
            If you need further assistance, please reach out to our support team at{' '}
            <a href="mailto:support@example.com" className="text-blue-500 hover:underline">support@example.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default HelpPage;