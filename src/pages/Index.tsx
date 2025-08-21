"use client";

import React from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button'; // Assuming shadcn/ui Button component

const Index: React.FC = () => {
  const { user } = useSession();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Welcome to Your App!</h1>
        {user ? (
          <>
            <p className="text-lg text-gray-600 mb-6">
              Hello, {user.email}! You are successfully logged in.
            </p>
            <Button onClick={handleLogout} className="w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
              Logout
            </Button>
          </>
        ) : (
          <p className="text-lg text-gray-600">
            You should be redirected to the login page if not authenticated.
          </p>
        )}
      </div>
    </div>
  );
};

export default Index;