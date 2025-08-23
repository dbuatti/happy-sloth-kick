"use client";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index"; // Removed .tsx extension
import Login from "./pages/Login"; // Corrected path and removed .tsx extension
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { supabase } from "./integrations/supabase/client";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TestPage from "./pages/TestPage"; // Removed .tsx extension

const queryClient = new QueryClient();

export default function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <QueryClientProvider client={queryClient}>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/test" element={<TestPage />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </SessionContextProvider>
  );
}