import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

const MainLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        <Outlet /> {/* This is where the nested routes (feature pages) will render */}
      </main>
    </div>
  );
};

export default MainLayout;