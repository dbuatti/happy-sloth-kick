"use client";

import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import SchedulePage from './pages/SchedulePage'; // Import the new SchedulePage
import { SessionContextProvider } from '@supabase/auth-ui-react';
import { supabase } from './integrations/supabase/client';
import { Toaster } from 'react-hot-toast';
import { Button } from './components/ui/button'; // Assuming you have a Button component

function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <Toaster />
      <Router>
        <div className="min-h-screen bg-gray-100">
          <nav className="bg-white shadow p-4 flex justify-between items-center">
            <h1 className="text-xl font-bold">My App</h1>
            <div>
              <Button asChild variant="ghost" className="mr-2">
                <Link to="/">Home</Link>
              </Button>
              <Button asChild variant="ghost" className="mr-2">
                <Link to="/schedule">Schedule</Link> {/* Add link to SchedulePage */}
              </Button>
              <Button asChild variant="ghost">
                <Link to="/login">Login</Link>
              </Button>
            </div>
          </nav>
          <main className="container mx-auto py-8">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/schedule" element={<SchedulePage />} /> {/* Add SchedulePage route */}
            </Routes>
          </main>
        </div>
      </Router>
    </SessionContextProvider>
  );
}

export default App;