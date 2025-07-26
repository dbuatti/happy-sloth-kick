import React, { createContext, useState, useEffect, FC, ReactNode, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client'; // Updated import path

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: { first_name: string | null; last_name: string | null } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null } | null>(null);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', currentUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error('Error fetching profile:', profileError);
        } else if (profileData) {
          setProfile(profileData);
        } else {
          setProfile(null); // No profile found
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    fetchUserAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        if (session?.user) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile on auth change:', profileError);
          } else if (profileData) {
            setProfile(profileData);
          } else {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, profile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};