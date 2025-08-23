"use client";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { supabase } from "./integrations/supabase/client";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // Import QueryClient and QueryClientProvider
import TestPage from "./pages/TestPage"; // Import the new TestPage

const queryClient = new QueryClient(); // Create a QueryClient instance

export default function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <QueryClientProvider client={queryClient}> {/* Wrap with QueryClientProvider */}
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/test" element={<TestPage />} /> {/* New route for TestPage */}
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </SessionContextProvider>
  );
}