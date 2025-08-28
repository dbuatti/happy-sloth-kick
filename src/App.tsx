"use client";

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Index } from "./pages/Index";
import MainLayout from "./components/MainLayout";
import NotFound from "./pages/NotFound";
import { SessionContextProvider } from "./integrations/supabase/auth"; // Import SessionContextProvider

function App() {
  return (
    <SessionContextProvider> {/* Wrap the entire router with the context provider */}
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Index />} />
            {/* Add other routes here as you create new pages */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </SessionContextProvider>
  );
}

export default App;