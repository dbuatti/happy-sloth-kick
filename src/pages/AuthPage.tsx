import React from 'react';
import AuthComponent from '@/components/AuthComponent';

const AuthPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-muted">
      <header className="p-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">TaskMaster</h1>
      </header>
      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <AuthComponent />
      </main>
      <footer className="p-6 text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TaskMaster. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default AuthPage;