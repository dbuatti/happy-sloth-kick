"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import DailyTasksPage from './pages/DailyTasksPage';
import DailyTasksV3 from './pages/DailyTasksV3';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/daily-tasks" element={<DailyTasksPage />} />
        <Route path="/daily-tasks-v3" element={<DailyTasksV3 />} />
      </Routes>
      <Toaster /> {/* Add Toaster component here */}
    </Router>
  );
}

export default App;