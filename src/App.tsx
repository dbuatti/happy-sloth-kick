import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import NotFound from "./pages/NotFound";
import MyHub from "./pages/MyHub";
import Help from "./pages/Help";
import ProjectBalanceTracker from "./pages/ProjectBalanceTracker";
import TimeBlockSchedule from "./pages/TimeBlockSchedule";
import Meditation from "./pages/Meditation";
import SleepTracker from "./pages/SleepTracker";
import MindfulnessTools from "./pages/MindfulnessTools";
import FocusMode from "./pages/FocusMode";
import LandingPage from "./pages/LandingPage";
import DailyTasksV2 from "./pages/DailyTasksV2"; // Import the new V2 page
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ReminderProvider } from "@/context/ReminderContext";
import { SoundProvider } from "@/context/SoundContext";
import Sidebar from "./components/Sidebar";
import AuthComponent from "@/components/AuthComponent";

// Import new dedicated mindfulness tool pages
import BodyScanMeditationPage from "./pages/mindfulness/BodyScanMeditationPage";
import MindfulEatingGuidePage from "./pages/mindfulness/MindfulEatingGuidePage";
import ProgressiveMuscleRelaxationPage from "./pages/mindfulness/ProgressiveMuscleRelaxationPage";
import GuidedImageryPage from "./pages/mindfulness/GuidedImageryPage";
import ThoughtDiffusionToolPage from "./pages/mindfulness/ThoughtDiffusionToolPage";
import SensoryToolPage from "./pages/mindfulness/SensoryToolPage";
import BreathingBubblePage from "./pages/mindfulness/BreathingBubblePage";


const queryClient = new QueryClient();

const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated and not on the landing page or auth page, redirect to landing
  if (!user && location.pathname !== '/' && location.pathname !== '/auth') {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {user ? (
        <Sidebar>
          <Routes>
            <Route path="/" element={<DailyTasksV2 />} /> {/* Default to V2 */}
            <Route path="/daily-tasks" element={<DailyTasksV2 />} /> {/* Explicit route for V2 */}
            <Route path="/my-hub" element={<MyHub />} />
            <Route path="/help" element={<Help />} />
            <Route path="/projects" element={<ProjectBalanceTracker />} />
            <Route path="/schedule" element={<TimeBlockSchedule />} />
            <Route path="/meditation" element={<Meditation />} />
            <Route path="/sleep" element={<SleepTracker />} />
            <Route path="/mindfulness" element={<MindfulnessTools />} />
            <Route path="/focus" element={<FocusMode />} />
            {/* <Route path="/daily-flow-prototype" element={<DailyFlowPrototype />} /> Removed */}
            <Route path="/auth" element={<AuthComponent />} />
            
            {/* New routes for dedicated mindfulness tools */}
            <Route path="/mindfulness/body-scan" element={<BodyScanMeditationPage />} />
            <Route path="/mindfulness/mindful-eating" element={<MindfulEatingGuidePage />} />
            <Route path="/mindfulness/pmr" element={<ProgressiveMuscleRelaxationPage />} />
            <Route path="/mindfulness/guided-imagery" element={<GuidedImageryPage />} />
            <Route path="/mindfulness/thought-diffusion" element={<ThoughtDiffusionToolPage />} />
            <Route path="/mindfulness/sensory-tool" element={<SensoryToolPage />} />
            <Route path="/mindfulness/breathing-bubble" element={<BreathingBubblePage />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Sidebar>
      ) : (
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthComponent />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner position="top-right" />
        <AuthProvider>
          <SoundProvider>
            <ReminderProvider>
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </ReminderProvider>
          </SoundProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;