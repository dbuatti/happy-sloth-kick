import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Archive from "./pages/Archive";
import { AuthProvider } from "@/context/AuthContext";
import CommandPalette from "./components/CommandPalette";
import { useState } from 'react';

const queryClient = new QueryClient();

const App = () => {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" /> {/* Changed position to top-right */}
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index setIsAddTaskOpen={setIsAddTaskOpen} />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
              <Route path="/archive" element={<Archive />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            {/* CommandPalette moved inside BrowserRouter */}
            <CommandPalette isAddTaskOpen={isAddTaskOpen} setIsAddTaskOpen={setIsAddTaskOpen} />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;