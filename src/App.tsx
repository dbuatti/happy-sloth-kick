import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { Toaster } from "@/components/ui/toaster.tsx";
import { SessionProvider } from "./integrations/supabase/session-context.tsx";
import Schedule from "./pages/Schedule.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <SessionProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </SessionProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;