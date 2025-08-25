import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { SessionContextProvider } from "./integrations/supabase/session-context";
import { Toaster } from "@/components/ui/sonner";
import SleepDashboard from "./pages/SleepDashboard";

function App() {
  return (
    <SessionContextProvider>
      <> {/* Added React Fragment here */}
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/sleep-dashboard" element={<SleepDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </> {/* Closed React Fragment here */}
    </SessionContextProvider>
  );
}

export default App;