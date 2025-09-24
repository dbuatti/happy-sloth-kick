import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Frown } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="container mx-auto py-6 px-4 max-w-4xl text-center">
        <Frown className="h-24 w-24 text-primary mb-6 mx-auto" />
        <h1 className="text-5xl font-extrabold tracking-tight text-foreground mb-4">
          404 - Page Not Found
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Oops! The page you're looking for doesn't exist.
        </p>
        <Link to="/">
          <Button size="lg" className="text-lg px-8 py-3">
            Go to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;