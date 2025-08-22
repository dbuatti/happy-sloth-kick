import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const LandingPage: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 text-white p-4">
      <h1 className="text-5xl font-bold mb-6 text-center">Welcome to Your Productivity Hub</h1>
      <p className="text-xl mb-8 text-center max-w-2xl">
        Organize your life, track your goals, and boost your focus with our intuitive task management and scheduling app.
      </p>
      <div className="space-x-4">
        {user ? (
          <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        ) : (
          <>
            <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              <Link to="/login">Sign In / Sign Up</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
              <Link to="/demo/dashboard">Try Demo</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default LandingPage;