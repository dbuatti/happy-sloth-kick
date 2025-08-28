"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Correct import for Supabase client
import { useToast } from '@/components/ui/use-toast';
import { TaskSection, Task } from '@/types/task';
import TaskSectionComponent from '@/components/TaskSection';
import AddSectionButton from '@/components/AddSectionButton';
import SectionSelector from '@/components/SectionSelector';
import { Button } from '@/components/ui/button';
import { Circle, CheckCircle, MoreHorizontal, Square, SquareCheck } from 'lucide-react';

const DailyTasksPage: React.FC = () => {
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [showMoveSection, setShowMoveSection] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  // const supabase = createClientComponentClient(); // No longer needed
  const { toast } = useToast();

  // Ref to store the ID of the last clicked task for Shift-selection
  const lastClickedTaskId = useRef<string | null>(null);

  useEffect(() => {
    fetchSectionsAndTasks();
  }, []);

  useEffect(() => {
    if (!isMultiSelectMode) {
      setSelectedTaskIds([]);
      setShowMoveSection(false);
      lastClickedTaskId.current = null; // Clear last clicked when exiting mode
    }
  }, [isMultiSelectMode]);

  const fetchSectionsAndTasks = async () => {
    try {
      setLoading(true);
      
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('task_sections')
        .select('*')
        .order('order', { ascending: true });

      if (sectionsError) throw sectionsError;

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true }); // Order by creation for consistent shift-selection

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

  const toggleTaskSelection = (taskId: string, event?: React.MouseEvent) => {
    const allVisibleTaskIds = tasks.map(t => t.id);

    if (event && (event.shiftKey && lastClickedTaskId.current)) {
      const startIndex = allVisibleTaskIds.indexOf(lastClickedTaskId.current);
      const endIndex = allVisibleTaskIds.indexOf(taskId);

      const [start, end] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
      const tasksToSelect = allVisibleTaskIds.slice(start, end + 1);

      setSelectedTaskIds(prev => {
        const newSelection = new Set(prev);
        tasksToSelect.forEach(id => newSelection.add(id));
        return Array.from(newSelection);
      });
    } else if (event && (event.metaKey || event.ctrlKey)) {
      setSelectedTaskIds(prev => 
        prev.includes(taskId) 
          ? prev.filter(id => id !== taskId) 
          : [...prev, taskId]
      );
      lastClickedTaskId.current = taskId;
    } else {
      // Normal click: select only this task, or toggle if already selected
      setSelectedTaskIds(prev => 
        prev.includes(taskId) && prev.length === 1
          ? [] // Deselect if only this one is selected
          : [taskId]
      );
      lastClickedTaskId.current = taskId;
    }
  };

  const selectAllTasks = () => {
    setSelectedTaskIds(tasks.map(task => task.id));
  };

  const clearSelection = () => {
    setSelectedTaskIds([]);
    lastClickedTaskId.current = null;
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

      setTasks(tasks.map(task => 
        selectedTaskIds.includes(task.id) 
          ? { ...task, section_id: sectionId } 
          : task
      ));

      toast({
        title: 'Tasks Moved',
        description: `${selectedTasksCount} task(s) moved successfully`,
      });

      setSelectedTaskIds([]);
      setShowMoveSection(false);
      setIsMultiSelectMode(false);
      lastClickedTaskId.current = null;
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
        
        <div className="flex items-center gap-2">
          {isMultiSelectMode ? (
            <>
              {hasSelectedTasks && (
                <span className="text-sm text-muted-foreground">
                  {selectedTasksCount} selected
                </span>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={selectAllTasks}
                disabled={selectedTasksCount === tasks.length}
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={clearSelection}
                disabled={!hasSelectedTasks}
              >
                Clear
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => setIsMultiSelectMode(false)}
              >
                Done
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsMultiSelectMode(true)}
            >
              Select Tasks
            </Button>
          )}
        </div>
      </div>

      {isMultiSelectMode && hasSelectedTasks && (
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
            isMultiSelectMode={isMultiSelectMode}
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
                    isSelected && isMultiSelectMode ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'
                  }`}
                >
                  {isMultiSelectMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={(e) => toggleTaskSelection(task.id, e)}
                    >
                      {isSelected ? (
                        <SquareCheck className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                  )}
                  
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