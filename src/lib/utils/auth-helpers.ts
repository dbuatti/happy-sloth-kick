import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

export const handleSignOut = async (navigate: (path: string) => void) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    showSuccess('Signed out successfully!');
    navigate('/');
  } catch (error: any) {
    showError(error.message);
  }
};