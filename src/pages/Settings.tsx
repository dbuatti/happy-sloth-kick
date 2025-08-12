import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Sun, Moon, MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import WorkHoursSettings from '@/components/WorkHoursSettings';
import ProjectTrackerSettings from '@/components/ProjectTrackerSettings';
import { useTheme } from 'next-themes';
import TaskSettings from '@/components/TaskSettings';
import PageToggleSettings from '@/components/PageToggleSettings';
import ScheduleSettings from '@/components/ScheduleSettings';

interface SettingsProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Settings: React.FC<SettingsProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const currentUserId = demoUserId || user?.id;
  const { theme, setTheme } = useTheme();

  const [profileLoading, setProfileLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    const getProfile = async () => {
      try {
        setProfileLoading(true);
        if (!currentUserId) return;

        const { data, error, status } = await supabase
          .from('profiles')
          .select(`id, first_name, last_name`)
          .eq('id', currentUserId)
          .single();

        if (error && status !== 406) { // PGRST116 means no rows found
          throw error;
        }

        if (data) {
          setFirstName(data.first_name || '');
          setLastName(data.last_name || '');
        }
      } catch (error: any) {
        console.error('Error fetching profile:', error);
        // Consider adding a toast error here if needed
      } finally {
        setProfileLoading(false);
      }
    };
    if (currentUserId) {
      getProfile();
    }
  }, [currentUserId]);

  const updateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsSavingProfile(true);
      if (!currentUserId) return;

      const updates = {
        id: currentUserId,
        first_name: firstName,
        last_name: lastName,
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }
      // showSuccess('Profile updated successfully!'); // Re-add toast if needed
    } catch (error: any) {
      console.error('Error updating profile:', error);
      // showError(error.message); // Re-add toast if needed
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSavingProfile(true); // Use profile saving state for sign out button
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // showSuccess('Signed out successfully!'); // Re-add toast if needed
      window.location.href = '/'; 
    } catch (error: any) {
      console.error('Error signing out:', error);
      // showError(error.message); // Re-add toast if needed
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-xl p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <SettingsIcon className="h-7 w-7 text-primary" /> Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-6">
            <Card className="w-full shadow-lg rounded-xl p-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-bold text-center">Profile Settings</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {profileLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <form onSubmit={updateProfile} className="space-y-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-foreground">First Name</label>
                      <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-9"
                        disabled={isDemo}
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-foreground">Last Name</label>
                      <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-9"
                        disabled={isDemo}
                      />
                    </div>
                    <Button type="submit" className="w-full h-9" disabled={isSavingProfile || isDemo}>
                      {isSavingProfile ? 'Saving...' : 'Update Profile'}
                    </Button>
                    {!isDemo && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full mt-4 h-9"
                        onClick={handleSignOut}
                        disabled={isSavingProfile}
                      >
                        Sign Out
                      </Button>
                    )}
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Theme Toggle */}
            <Card className="w-full shadow-lg rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Sun className="h-6 w-6 text-primary" /> Theme
                </CardTitle>
                <p className="text-sm text-muted-foreground">Switch between light and dark modes.</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <label htmlFor="dark-mode-toggle" className="text-base font-medium">Dark Mode</label>
                  <Button
                    id="dark-mode-toggle"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    aria-label="Toggle dark mode"
                  >
                    {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <PageToggleSettings />
            <TaskSettings />
            <ScheduleSettings />
            <WorkHoursSettings />
            <ProjectTrackerSettings />

            {/* Chat Link Placeholder */}
            <Card className="w-full shadow-lg rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <MessageSquare className="h-6 w-6 text-primary" /> Support
                </CardTitle>
                <p className="text-sm text-muted-foreground">Need help? Contact our support team.</p>
              </CardHeader>
              <CardContent className="pt-0">
                <a href="#" className="text-blue-500 hover:underline text-sm">Chat with Support</a>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;