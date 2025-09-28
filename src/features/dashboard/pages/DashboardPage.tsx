import React from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const DashboardPage = () => {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <div className="flex justify-center items-center h-screen">Please log in.</div>;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Welcome, {user.email}!</h1>
      <p className="text-lg mb-6">This is your new dashboard. More content will be added here.</p>
      <Button onClick={handleSignOut}>Sign Out</Button>
    </div>
  );
};

export default DashboardPage;