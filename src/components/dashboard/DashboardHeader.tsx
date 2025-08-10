import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardHeaderProps {
  onAddCard: () => void;
  onCustomizeLayout: () => void;
  isDemo: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onAddCard, onCustomizeLayout, isDemo }) => {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', user.id)
          .single();
        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
          setFirstName(data.first_name);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div>
        {loading ? (
          <Skeleton className="h-9 w-48" />
        ) : (
          <h1 className="text-3xl font-bold">
            Welcome back{firstName ? `, ${firstName}` : ''}!
          </h1>
        )}
        <p className="text-muted-foreground">Here's your overview for today.</p>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Button onClick={onAddCard} disabled={isDemo}>
          <Plus className="mr-2 h-4 w-4" /> Add Card
        </Button>
        <Button variant="outline" size="icon" onClick={onCustomizeLayout}>
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;