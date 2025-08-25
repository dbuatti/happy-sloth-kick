import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { SessionContextProvider } from "./integrations/supabase/session-context";
import { Toaster } from "@/components/ui/sonner";
import SleepDashboard from "./pages/SleepDashboard";

function App() {
  return (
    <> {/* Main React Fragment for the entire app */}
      <Toaster /> {/* Moved Toaster here, outside SessionContextProvider */}
      <SessionContextProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/sleep-dashboard" element={<SleepDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SessionContextProvider>
    </>
  );
}

export default App;