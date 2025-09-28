"use client";

import React from 'react';
import { Link } from 'react-router-dom';

const Index: React.FC = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome to Your App!</h1>
      <p className="mb-2">This is your main application page. You can navigate to other sections using the links above.</p>
      <p>Try visiting the <Link to="/meal-planner" className="text-blue-600 hover:underline">Meal Planner</Link>.</p>
    </div>
  );
};

export default Index;