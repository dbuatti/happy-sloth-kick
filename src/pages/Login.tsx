import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';

const Login: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center text-foreground">Sign In / Sign Up</h2>
        <Auth
          supabaseClient={supabase}
          providers={['google']}
          appearance={{ theme: ThemeSupa }}
          theme="dark" // Assuming a dark theme for consistency
          redirectTo={window.location.origin}
        />
      </div>
    </div>
  );
};

export default Login;