import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
// Temporarily remove SessionContextProvider and Toaster to isolate the error
// import { SessionContextProvider } from "./integrations/supabase/session-context";
// import { Toaster } from "@/components/ui/sonner";
import SleepDashboard from "./pages/SleepDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/sleep-dashboard" element={<SleepDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;