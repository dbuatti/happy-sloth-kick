import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { CheckCircle2, Sparkles, LayoutDashboard, CalendarDays } from 'lucide-react';

const LandingPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      // If user is authenticated, redirect to the daily tasks page
      navigate('/daily-tasks');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || user) {
    // Show a loading spinner or nothing while checking auth status
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-muted">
      <header className="p-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">TaskMaster</h1>
        <Button onClick={() => navigate('/auth')} variant="default">Sign In / Sign Up</Button>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center text-center px-4 py-12">
        <div className="max-w-3xl space-y-8">
          <h2 className="text-5xl md:text-6xl font-extrabold text-foreground leading-tight">
            Master Your Day, Achieve Your Goals.
          </h2>
          <p className="text-xl text-muted-foreground">
            TaskMaster is your intelligent companion for daily productivity, mindful living, and personal growth.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')}>
              <Sparkles className="mr-2 h-5 w-5" /> Get Started - It's Free!
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/help')}>
              <LayoutDashboard className="mr-2 h-5 w-5" /> Learn More
            </Button>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
          <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center text-center">
            <CalendarDays className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Intuitive Daily Planning</h3>
            <p className="text-muted-foreground text-sm">Organize tasks, set priorities, and track progress with ease.</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center text-center">
            <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Smart Productivity Tools</h3>
            <p className="text-muted-foreground text-sm">Focus mode, project balancing, and AI-powered suggestions.</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center text-center">
            <Sparkles className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Mindful Living Integration</h3>
            <p className="text-muted-foreground text-sm">Journals, meditations, and sensory tools for well-being.</p>
          </div>
        </div>
      </main>

      <footer className="p-6 text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TaskMaster. All rights reserved.</p>
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default LandingPage;