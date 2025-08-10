import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';

export interface Person {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  notes: string | null;
  created_at: string;
}

export const usePeopleMemory = (props?: { userId?: string }) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPeople = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('people_memory')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setPeople(data || []);
    } catch (error: any) {
      showError('Failed to load people.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const addPerson = async (personData: { name: string; notes: string | null }) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('people_memory')
        .insert({ ...personData, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      setPeople(prev => [...prev, data]);
      showSuccess('Person added!');
      return data;
    } catch (error) {
      showError('Failed to add person.');
      return null;
    }
  };

  const updatePerson = async (id: string, updates: Partial<Omit<Person, 'id' | 'user_id' | 'created_at'>>) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('people_memory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setPeople(prev => prev.map(p => p.id === id ? data : p));
      showSuccess('Person updated!');
      return data;
    } catch (error) {
      showError('Failed to update person.');
      return null;
    }
  };

  const deletePerson = async (id: string) => {
    if (!userId) return false;
    try {
      const { error } = await supabase.from('people_memory').delete().eq('id', id);
      if (error) throw error;
      setPeople(prev => prev.filter(p => p.id !== id));
      showSuccess('Person removed.');
      return true;
    } catch (error) {
      showError('Failed to remove person.');
      return false;
    }
  };

  const uploadAvatar = async (id: string, file: File) => {
    if (!userId) return null;
    try {
      const filePath = `people_avatars/${userId}/${id}/${uuidv4()}`;
      const { error: uploadError } = await supabase.storage
        .from('devideaimages')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('devideaimages')
        .getPublicUrl(filePath);
      
      return await updatePerson(id, { avatar_url: urlData.publicUrl });
    } catch (error) {
      showError('Failed to upload avatar.');
      return null;
    }
  };

  return { people, loading, addPerson, updatePerson, deletePerson, uploadAvatar };
};