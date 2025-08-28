"use client";

import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SessionContextProvider } from "@/integrations/supabase/auth";
import { Toaster } from "@/components/ui/sonner";
import MainLayout from "@/components/MainLayout"; // Changed to default import
import { NotFound } from "@/pages/NotFound";
import Index from "@/pages/Index";

function App() {
  return (
    <SessionContextProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Index />} />
            {/* Removed routes for Mindfulness and Meditation */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </SessionContextProvider>
  );
}

export default App;