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

  const addPerson = async (personData: { name: string; notes: string | null }, avatarFile?: File | null) => {
    if (!userId) return null;
    try {
      const { data: newPerson, error: insertError } = await supabase
        .from('people_memory')
        .insert({ ...personData, user_id: userId })
        .select()
        .single();
      if (insertError) throw insertError;

      if (avatarFile) {
        const filePath = `people_avatars/${userId}/${newPerson.id}/${uuidv4()}`;
        const { error: uploadError } = await supabase.storage
          .from('devideaimages')
          .upload(filePath, avatarFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('devideaimages').getPublicUrl(filePath);
        
        const { data: updatedPerson, error: updateError } = await supabase
          .from('people_memory')
          .update({ avatar_url: urlData.publicUrl })
          .eq('id', newPerson.id)
          .select()
          .single();
        if (updateError) throw updateError;

        setPeople(prev => [...prev, updatedPerson]);
        showSuccess('Person added with avatar!');
        return updatedPerson;
      } else {
        setPeople(prev => [...prev, newPerson]);
        showSuccess('Person added!');
        return newPerson;
      }
    } catch (error) {
      showError('Failed to add person.');
      return null;
    }
  };

  const updatePerson = async (id: string, updates: Partial<Omit<Person, 'id' | 'user_id' | 'created_at'>>, avatarFile?: File | null) => {
    if (!userId) return null;
    try {
      const finalUpdates = { ...updates };

      if (avatarFile) {
        const personToUpdate = people.find(p => p.id === id);
        if (personToUpdate?.avatar_url) {
          const oldFilePath = personToUpdate.avatar_url.split('/devideaimages/')[1];
          if (oldFilePath) {
            await supabase.storage.from('devideaimages').remove([oldFilePath]);
          }
        }

        const filePath = `people_avatars/${userId}/${id}/${uuidv4()}`;
        const { error: uploadError } = await supabase.storage
          .from('devideaimages')
          .upload(filePath, avatarFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('devideaimages').getPublicUrl(filePath);
        finalUpdates.avatar_url = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('people_memory')
        .update(finalUpdates)
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

  return { people, loading, addPerson, updatePerson, deletePerson };
};