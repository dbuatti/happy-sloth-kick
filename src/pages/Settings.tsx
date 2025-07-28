import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { MadeWithDyad } from "@/components/made-with-dyad"; // Ensure MadeWithDyad is imported
import WorkHoursSettings from '@/components/WorkHoursSettings';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error, status } = await supabase
          .from('profiles')
          .select(`id, first_name, last_name`)
          .eq('id', user.id)
          .single();

        if (error && status !== 406) {
          throw error;
        }

        if (data) {
          setProfile(data);
          setFirstName(data.first_name || '');
          setLastName(data.last_name || '');
        }
      }
    } catch (error: any) {
      showError(error.message);
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const updates = {
          id: user.id,
          first_name: firstName,
          last_name: lastName,
        };

        const { error } = await supabase.from('profiles').upsert(updates);

        if (error) {
          throw error;
        }
        showSuccess('Profile updated successfully!');
      }
    } catch (error: any) {
      showError(error.message);
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      showSuccess('Signed out successfully!');
      // Redirect to login page or home page after sign out
      window.location.href = '/'; 
    } catch (error: any) {
      showError(error.message);
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <div className="w-full max-w-md mx-auto space-y-3"> {/* Reduced space-y-4 to space-y-3 */}
          <Card className="w-full shadow-lg p-3"> {/* Reduced p-4 to p-3 */}
            <CardHeader className="pb-1"> {/* Reduced pb-2 to pb-1 */}
              <CardTitle className="text-2xl font-bold text-center">Profile Settings</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="text-center">Loading profile...</div>
              ) : (
                <form onSubmit={updateProfile} className="space-y-3"> {/* Reduced space-y-4 to space-y-3 */}
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Saving...' : 'Update Profile'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-3" /* Reduced mt-4 to mt-3 */
                    onClick={handleSignOut}
                    disabled={loading}
                  >
                    Sign Out
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <WorkHoursSettings />
        </div>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default Settings;