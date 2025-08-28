"use client";

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/components/ui/use-toast';
import { TaskSection } from '@/types/task';
import TaskSectionComponent from '@/components/TaskSection';
import AddSectionButton from '@/components/AddSectionButton';

const DailyTasksPage: React.FC = () => {
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('task_sections')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sections',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSection = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('task_sections')
        .insert({
          name,
          order: sections.length,
        })
        .select()
        .single();

      if (error) throw error;

      setSections([...sections, data]);
      toast({
        title: 'Section Added',
        description: `Section "${name}" has been added`,
      });
    } catch (error) {
      console.error('Error adding section:', error);
      toast({
        title: 'Error',
        description: 'Failed to add section',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Daily Tasks</h1>
      
      <div className="space-y-6">
        {sections.map((section) => (
          <TaskSectionComponent 
            key={section.id} 
            section={section} 
          />
        ))}
        
        <div className="mt-6">
          <AddSectionButton onAddSection={handleAddSection} />
        </div>
      </div>
    </div>
  );
};

export default DailyTasksPage;