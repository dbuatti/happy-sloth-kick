"use client";

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/components/ui/use-toast';
import { TaskSection, Task } from '@/types/task';
import TaskSectionComponent from '@/components/TaskSection';
import AddSectionButton from '@/components/AddSectionButton';
import SectionSelector from '@/components/SectionSelector';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Circle, CheckCircle, MoreHorizontal } from 'lucide-react';

const DailyTasksPage: React.FC = () => {
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [showMoveSection, setShowMoveSection] = useState(false);
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  useEffect(() => {
    fetchSectionsAndTasks();
  }, []);

  const fetchSectionsAndTasks = async () => {
    try {
      setLoading(true);
      
      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('task_sections')
        .select('*')
        .order('order', { ascending: true });

      if (sectionsError) throw sectionsError;

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true });

      if (tasksError) throw tasksError;

      setSections(sectionsData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
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

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) 
        : [...prev, taskId]
    );
  };

  const selectAllTasks = () => {
    const allTaskIds = tasks.map(task => task.id);
    setSelectedTaskIds(allTaskIds);
  };

  const clearSelection = () => {
    setSelectedTaskIds([]);
  };

  const toggleTaskCompletion = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const newStatus = task.status === 'completed' ? 'to-do' : 'completed';
      
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));

      toast({
        title: 'Task Updated',
        description: `Task marked as ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const moveSelectedTasks = async (sectionId: string | null) => {
    if (selectedTaskIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ section_id: sectionId })
        .in('id', selectedTaskIds);

      if (error) throw error;

      // Update local state
      setTasks(tasks.map(task => 
        selectedTaskIds.includes(task.id) 
          ? { ...task, section_id: sectionId } 
          : task
      ));

      toast({
        title: 'Tasks Moved',
        description: `${selectedTaskIds.length} task(s) moved successfully`,
      });

      // Clear selection
      setSelectedTaskIds([]);
      setShowMoveSection(false);
    } catch (error) {
      console.error('Error moving tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to move tasks',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  const selectedTasksCount = selectedTaskIds.length;
  const hasSelectedTasks = selectedTasksCount > 0;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Daily Tasks</h1>
        
        {hasSelectedTasks && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedTasksCount} selected
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearSelection}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {hasSelectedTasks && (
        <div className="mb-4 p-3 bg-muted rounded-lg flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowMoveSection(!showMoveSection)}
          >
            Move to Section
          </Button>
          
          {showMoveSection && (
            <div className="flex items-center gap-2 flex-1">
              <SectionSelector
                sections={sections}
                selectedSectionId={null}
                onSectionChange={moveSelectedTasks}
                placeholder="Select section..."
              />
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowMoveSection(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {sections.map((section) => (
          <TaskSectionComponent 
            key={section.id} 
            section={section} 
            tasks={tasks.filter(task => task.section_id === section.id)}
            selectedTaskIds={selectedTaskIds}
            onTaskSelect={toggleTaskSelection}
            onTaskToggle={toggleTaskCompletion}
          />
        ))}
        
        {/* Tasks without section */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Other Tasks</h2>
          {tasks
            .filter(task => !task.section_id)
            .map((task) => {
              const isSelected = selectedTaskIds.includes(task.id);
              const isCompleted = task.status === 'completed';
              
              return (
                <div 
                  key={task.id} 
                  className={`flex items-center gap-2 p-2 rounded transition-colors ${
                    isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'
                  }`}
                >
                  {/* Selection checkbox */}
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleTaskSelection(task.id)}
                    className="mr-2"
                  />
                  
                  {/* Task completion toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto"
                    onClick={() => toggleTaskCompletion(task.id)}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                  
                  <span className={`flex-1 ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                    {task.description}
                  </span>
                  
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            
          {tasks.filter(task => !task.section_id).length === 0 && (
            <p className="text-muted-foreground text-sm">No tasks without a section</p>
          )}
        </div>
        
        <div className="mt-6">
          <AddSectionButton onAddSection={handleAddSection} />
        </div>
      </div>
    </div>
  );
};

export default DailyTasksPage;