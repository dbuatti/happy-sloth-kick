import React from 'react';
import AuthComponent from '@/components/AuthComponent';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const AuthPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <div className="absolute top-4 left-4">
          <Link to="/">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
          </Link>
        </div>
        <AuthComponent />
      </div>
    </div>
  );
};

export default AuthPage;