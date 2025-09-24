import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListTodo, Sparkles, Target, CalendarDays, Code, Moon, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AuthComponent from '@/components/AuthComponent';
import ADHDTimeDateBanner from '@/components/ADHDTimeDateBanner';

const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <ADHDTimeDateBanner />

        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-4">
            TaskMaster
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Your all-in-one productivity hub designed to help you focus, plan, and achieve your goals with clarity and ease.
          </p>
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="text-lg px-8 py-3">
                  Get Started
                </Button>
              </Link>
              <Link to="/demo">
                <Button size="lg" variant="outline" className="text-lg px-8 py-3">
                  Try Demo
                </Button>
              </Link>
            </div>
          )}
        </div>

        {user ? (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground mb-6">Welcome Back!</h2>
            <Link to="/dashboard">
              <Button size="lg" className="text-lg px-8 py-3">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <AuthComponent />
          </div>
        )}

        <section className="mt-20 text-center">
          <h2 className="text-4xl font-bold text-foreground mb-10">Features Designed for You</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={ListTodo}
              title="Intuitive Task Management"
              description="Organize your daily tasks, set priorities, and track your progress effortlessly."
            />
            <FeatureCard
              icon={CalendarDays}
              title="Time Blocking Schedule"
              description="Visually plan your day with time blocks, appointments, and scheduled tasks."
            />
            <FeatureCard
              icon={Target}
              title="Resonance Goals"
              description="Set and track long-term goals, breaking them down into actionable steps."
            />
            <FeatureCard
              icon={Sparkles}
              title="AI-Powered Suggestions"
              description="Get smart recommendations for task details, categories, and more."
            />
            <FeatureCard
              icon={Code}
              title="Dev Space for Ideas"
              description="Capture, organize, and manage your development ideas with tags and status."
            />
            <FeatureCard
              icon={UtensilsCrossed}
              title="Meal Planning & Staples"
              description="Plan your meals for the week and keep track of your pantry inventory."
            />
            <FeatureCard
              icon={Moon}
              title="Sleep Tracking"
              description="Monitor your sleep patterns and gain insights into your rest quality."
            />
          </div>
        </section>
      </div>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description }) => (
  <Card className="shadow-lg rounded-xl hover:shadow-xl transition-shadow duration-200">
    <CardHeader className="flex flex-col items-center text-center pb-4">
      <Icon className="h-10 w-10 text-primary mb-3" />
      <CardTitle className="text-xl font-semibold">{title}</CardTitle>
    </CardHeader>
    <CardContent className="text-muted-foreground text-sm">
      {description}
    </CardContent>
  </Card>
);

export default LandingPage;