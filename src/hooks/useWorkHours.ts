import { useAuth } from '@/context/AuthContext';
import { WorkHour, NewWorkHourData, UpdateWorkHourData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

interface UseWorkHoursProps {
  userId?: string;
}

export const useWorkHours = ({ userId: propUserId }: UseWorkHoursProps = {}) => {
  const { user } = useAuth();
  const currentUserId = propUserId || user?.id;
  const queryClient = useQueryClient();

  const { data: workHours, isLoading, error } = useQuery<WorkHour[], Error>({
    queryKey: ['workHours', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('user_work_hours')
        .select('*')
        .eq('user_id', currentUserId)
        .order('day_of_week', { ascending: true }); // Order by day of week for consistent display

      if (error) throw error;
      return data as WorkHour[];
    },
    enabled: !!currentUserId,
  });

  const addWorkHourMutation = useMutation<WorkHour, Error, NewWorkHourData, unknown>({
    mutationFn: async (newWorkHourData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('user_work_hours')
        .insert({ ...newWorkHourData, user_id: currentUserId })
        .select()
        .single();

      if (error) throw error;
      return data as WorkHour;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workHours', currentUserId] });
      toast.success('Work hour added!');
    },
  });

  const updateWorkHourMutation = useMutation<WorkHour, Error, { id: string; updates: UpdateWorkHourData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('user_work_hours')
        .update(updates)
        .eq('id', id)
        .eq('user_id', currentUserId)
        .select()
        .single();

      if (error) throw error;
      return data as WorkHour;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workHours', currentUserId] });
      toast.success('Work hour updated!');
    },
  });

  const deleteWorkHourMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('user_work_hours')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workHours', currentUserId] });
      toast.success('Work hour deleted!');
    },
  });

  return {
    workHours: workHours || [],
    isLoading,
    error,
    addWorkHour: addWorkHourMutation.mutateAsync,
    updateWorkHour: updateWorkHourMutation.mutateAsync,
    deleteWorkHour: deleteWorkHourMutation.mutateAsync,
  };
};