"use client";

import React from "react";
import { Outlet } from "react-router-dom";

const MainLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* You can add a header/navbar here later */}
      <main className="flex-grow">
        <Outlet /> {/* This is where your route components will be rendered */}
      </main>
      {/* You can add a footer here later */}
    </div>
  );
};

export default MainLayout;