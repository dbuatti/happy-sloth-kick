import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { supabase } from "@/integrations/supabase/client";
import { SettingsProvider } from "@/context/SettingsContext"; // Import SettingsProvider

import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import Schedule from "@/pages/Schedule";
import Projects from "@/pages/Projects";
import Journal from "@/pages/Journal";
import Sleep from "@/pages/Sleep";
import People from "@/pages/People";
import Settings from "@/pages/Settings";
import DevIdeas from "@/pages/DevIdeas";

import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

function App() {
  // For demonstration purposes, a hardcoded user ID or a way to get the current user's ID
  // In a real app, this would come from the authenticated user session
  const demoUserId = "d889323b-350c-4764-9788-6359f85f6142"; // Replace with actual user ID from auth

  return (
    <SessionContextProvider supabaseClient={supabase}>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider> {/* Removed userId prop */}
          <Toaster richColors />
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Index />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="schedule" element={<Schedule />} />
                <Route path="projects" element={<Projects />} />
                <Route path="journal" element={<Journal />} />
                <Route path="sleep" element={<Sleep />} />
                <Route path="people" element={<People />} />
                <Route path="settings" element={<Settings />} />
                <Route path="dev-ideas" element={<DevIdeas />} />
              </Route>
            </Routes>
          </Router>
        </SettingsProvider>
      </QueryClientProvider>
    </SessionContextProvider>
  );
}

export default App;