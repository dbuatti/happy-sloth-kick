import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { SupabaseLayout } from "./integrations/supabase/SupabaseLayout";
import DevPage from "./pages/DevPage"; // Import the new DevPage

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router>
        <Routes>
          <Route path="/" element={<SupabaseLayout />}>
            <Route index element={<Index />} />
            <Route path="/dev" element={<DevPage />} /> {/* New route for DevPage */}
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;