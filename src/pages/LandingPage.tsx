import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
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
        <h1 className="text-4xl font-bold text-primary">TaskMaster</h1> {/* Increased font size */}
        <Button onClick={() => navigate('/auth')} variant="default" className="h-10 text-base rounded-lg">Sign In / Sign Up</Button> {/* Added rounded-lg */}
      </header>

      <main className="flex-grow flex flex-col items-center justify-center text-center px-4 py-12 md:py-20"> {/* Increased vertical padding */}
        <div className="max-w-4xl space-y-8"> {/* Increased max-width slightly */}
          <h2 className="text-5xl md:text-7xl font-extrabold text-foreground leading-tight tracking-tight"> {/* Increased font size, added tracking */}
            Master Your Day, Achieve Your Goals.
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto"> {/* Increased font size, added max-width for narrower text block */}
            TaskMaster is your intelligent companion for daily productivity, mindful living, and personal growth.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4"> {/* Added pt-4 for more space */}
            <Button size="lg" onClick={() => navigate('/auth')} className="h-14 px-8 text-lg rounded-lg shadow-md"> {/* Increased height, added shadow, rounded-lg */}
              <Sparkles className="mr-2 h-5 w-5" /> Get Started - It's Free!
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/demo')} className="h-14 px-8 text-lg rounded-lg shadow-md"> {/* Increased height, added shadow, rounded-lg */}
              <LayoutDashboard className="mr-2 h-5 w-5" /> View Live Demo
            </Button>
          </div>
        </div>

        <div className="mt-20 md:mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full"> {/* Increased top margin, max-width */}
          <div className="bg-card p-8 rounded-2xl shadow-lg flex flex-col items-center text-center"> {/* Changed to rounded-2xl, increased padding */}
            <CalendarDays className="h-14 w-14 text-primary mb-4" /> {/* Increased icon size */}
            <h3 className="text-2xl font-semibold mb-2 text-foreground">Intuitive Daily Planning</h3> {/* Increased font size, ensured foreground color */}
            <p className="text-muted-foreground text-base">Organize tasks, set priorities, and track progress with ease.</p> {/* Increased font size */}
          </div>
          <div className="bg-card p-8 rounded-2xl shadow-lg flex flex-col items-center text-center"> {/* Changed to rounded-2xl, increased padding */}
            <CheckCircle2 className="h-14 w-14 text-primary mb-4" /> {/* Increased icon size */}
            <h3 className="text-2xl font-semibold mb-2 text-foreground">Smart Productivity Tools</h3> {/* Increased font size, ensured foreground color */}
            <p className="text-muted-foreground text-base">Focus mode, project balancing, and AI-powered suggestions.</p> {/* Increased font size */}
          </div>
          <div className="bg-card p-8 rounded-2xl shadow-lg flex flex-col items-center text-center"> {/* Changed to rounded-2xl, increased padding */}
            <Sparkles className="h-14 w-14 text-primary mb-4" /> {/* Increased icon size */}
            <h3 className="text-2xl font-semibold mb-2 text-foreground">Mindful Living Integration</h3> {/* Increased font size, ensured foreground color */}
            <p className="text-muted-foreground text-base">Journals, meditations, and sensory tools for well-being.</p> {/* Increased font size */}
          </div>
        </div>
      </main>

      <footer className="p-6 text-center text-muted-foreground text-sm"> {/* Reduced font size slightly */}
        <p>&copy; {new Date().getFullYear()} TaskMaster. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;