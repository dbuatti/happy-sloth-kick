import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, closestCorners, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskSection from '@/components/tasks/TaskSection';
import { Task, TaskSection as TTaskSection } from '@/types/supabase';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';

const TasksPage: React.FC = () => {
  const [sections, setSections] = useState<TTaskSection[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configure Dnd-kit sensors with a delay for touch activation
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 5, // Require a minimum distance to be dragged
        delay: 250,  // Require a 250ms hold before activating drag
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const { data: sectionsData, error: sectionsError } = await supabase
      .from('task_sections')
      .select('*')
      .order('order', { ascending: true });

    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .order('order', { ascending: true });

    if (sectionsError) {
      setError(sectionsError.message);
      console.error('Error fetching sections:', sectionsError);
    } else {
      setSections(sectionsData || []);
    }

    if (tasksError) {
      setError(tasksError.message);
      console.error('Error fetching tasks:', tasksError);
    } else {
      setTasks(tasksData || []);
    }
    setLoading(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      const activeTask = tasks.find(t => t.id === active.id);
      const overTask = tasks.find(t => t.id === over.id);
      const activeSection = sections.find(s => s.id === active.id);
      const overSection = sections.find(s => s.id === over.id);

      if (activeTask && overTask) {
        // Reordering tasks within the same section or moving between sections
        const oldIndex = tasks.findIndex(t => t.id === active.id);
        const newIndex = tasks.findIndex(t => t.id === over.id);

        const newTasks = arrayMove(tasks, oldIndex, newIndex);
        setTasks(newTasks);

        // Prepare updates for the database
        const updates = newTasks.map((task, index) => ({
          id: task.id,
          order: index,
          section_id: task.section_id,
          parent_task_id: task.parent_task_id,
        }));

        // If a task is moved to a different section, update its section_id
        if (activeTask.section_id !== overTask.section_id) {
          const updatedActiveTask = updates.find(u => u.id === activeTask.id);
          if (updatedActiveTask) {
            updatedActiveTask.section_id = overTask.section_id;
          }
        }

        const { error: updateError } = await supabase.rpc('update_tasks_order', { updates });
        if (updateError) {
          console.error('Error updating task order:', updateError);
          fetchData(); // Revert state if error
        }
      } else if (activeSection && overSection) {
        // Reordering sections
        const oldIndex = sections.findIndex(s => s.id === active.id);
        const newIndex = sections.findIndex(s => s.id === over.id);

        const newSections = arrayMove(sections, oldIndex, newIndex);
        setSections(newSections);

        const updates = newSections.map((section, index) => ({
          id: section.id,
          order: index,
        }));

        const { error: updateError } = await supabase.from('task_sections').upsert(updates);
        if (updateError) {
          console.error('Error updating section order:', updateError);
          fetchData();
        }
      } else if (activeTask && overSection) {
        // Moving a task to a new section (dropping on section header)
        const newTasks = tasks.map(task =>
          task.id === activeTask.id ? { ...task, section_id: overSection.id } : task
        );
        setTasks(newTasks);

        const { error: updateError } = await supabase
          .from('tasks')
          .update({ section_id: overSection.id })
          .eq('id', activeTask.id);

        if (updateError) {
          console.error('Error moving task to new section:', updateError);
          fetchData();
        }
      }
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    setTasks(prevTasks => prevTasks.map(task => task.id === id ? { ...task, ...updates } : task));
    const { error } = await supabase.from('tasks').update(updates).eq('id', id);
    if (error) {
      console.error('Error updating task:', error);
      fetchData(); // Revert or refetch on error
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting task:', error);
      fetchData(); // Revert or refetch on error
    }
  };

  const handleToggleCompleteTask = async (id: string, checked: boolean) => {
    const newStatus = checked ? 'completed' : 'to-do';
    setTasks(prevTasks => prevTasks.map(task => task.id === id ? { ...task, status: newStatus } : task));
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
    if (error) {
      console.error('Error toggling task completion:', error);
      fetchData(); // Revert or refetch on error
    }
  };

  const handleUpdateSection = async (id: string, updates: Partial<TTaskSection>) => {
    setSections(prevSections => prevSections.map(section => section.id === id ? { ...section, ...updates } : section));
    const { error } = await supabase.from('task_sections').update(updates).eq('id', id);
    if (error) {
      console.error('Error updating section:', error);
      fetchData();
    }
  };

  const handleDeleteSection = async (id: string) => {
    setSections(prevSections => prevSections.filter(section => section.id !== id));
    setTasks(prevTasks => prevTasks.filter(task => task.section_id !== id)); // Also remove tasks in this section
    const { error } = await supabase.from('task_sections').delete().eq('id', id);
    if (error) {
      console.error('Error deleting section:', error);
      fetchData();
    }
  };

  const handleAddTask = async (sectionId: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      console.error('User not authenticated.');
      return;
    }

    const newTask: Task = {
      id: uuidv4(),
      description: 'New Task',
      status: 'to-do',
      created_at: new Date().toISOString(),
      user_id: user.id,
      priority: 'medium',
      section_id: sectionId,
      order: tasks.filter(t => t.section_id === sectionId).length,
      due_date: null, notes: null, remind_at: null, parent_task_id: null,
      recurring_type: 'none', original_task_id: null, category: null,
      link: null, image_url: null, updated_at: null,
    };
    setTasks(prevTasks => [...prevTasks, newTask]);
    const { error } = await supabase.from('tasks').insert(newTask);
    if (error) {
      console.error('Error adding task:', error);
      fetchData();
    }
  };

  const handleAddSection = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      console.error('User not authenticated.');
      return;
    }

    const newSection: TTaskSection = {
      id: uuidv4(),
      name: 'New Section',
      user_id: user.id,
      order: sections.length,
      created_at: new Date().toISOString(),
      include_in_focus_mode: true,
    };
    setSections(prevSections => [...prevSections, newSection]);
    const { error } = await supabase.from('task_sections').insert(newSection);
    if (error) {
      console.error('Error adding section:', error);
      fetchData();
    }
  };

  const handleOpenTaskDetails = (task: Task) => {
    console.log('Open task details for:', task.id);
    // TODO: Implement modal or navigation to task details page
  };

  if (loading) return <div className="p-4 text-center">Loading tasks...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-foreground">My Tasks</h1>
      <Button onClick={handleAddSection} className="mb-4">Add New Section</Button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map((section) => (
            <TaskSection
              key={section.id}
              section={section}
              tasks={tasks.filter(task => task.section_id === section.id).sort((a, b) => (a.order || 0) - (b.order || 0))}
              onUpdateSection={handleUpdateSection}
              onDeleteSection={handleDeleteSection}
              onAddTask={handleAddTask}
              onUpdate={handleUpdateTask}
              onDelete={handleDeleteTask}
              onToggleComplete={handleToggleCompleteTask}
              onOpenTaskDetails={handleOpenTaskDetails}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default TasksPage;