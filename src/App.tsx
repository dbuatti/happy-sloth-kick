"use client";

import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
// SessionContextProvider is not exported by @supabase/auth-ui-react, removed.
// import { supabase } from './integrations/supabase/client'; // Removed as it's not directly used here
import ProtectedRoute from './components/ProtectedRoute';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import MealPlanner from './pages/MealPlanner';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* SessionContextProvider removed as it's not from @supabase/auth-ui-react and our useAuth hook handles session */}
      <Toaster />
      <Router>
        <nav className="p-4 bg-gray-800 text-white">
          <ul className="flex space-x-4">
            <li>
              <Link to="/" className="hover:underline">Home</Link>
            </li>
            <li>
              <Link to="/meal-planner" className="hover:underline">Meal Planner</Link>
            </li>
            {/* Add other navigation links here */}
          </ul>
        </nav>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meal-planner"
            element={
              <ProtectedRoute>
                <MealPlanner />
              </ProtectedRoute>
            }
          />
          {/* Add other protected routes here */}
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;