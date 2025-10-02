"use client";

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Removed: import { Label } from '@/components/ui/label'; // Unused import
// Removed: import { Textarea } from '@/components/ui/textarea'; // Unused import
// Removed: import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Unused import
// Removed: import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Unused import
import { Lightbulb, Settings, Trash2, Plus } from 'lucide-react'; // Removed CalendarIcon, imported Plus
// Removed: import { Calendar } from '@/components/ui/calendar'; // Unused import
import { format, parseISO } from 'date-fns'; // Removed isValid
import { cn } from '@/lib/utils';
import { useTasks, Category } from '@/hooks/useTasks'; // Removed Task, TaskSection
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import ManageCategoriesDialog from '@/components/ManageCategoriesDialog';
import { Card } from '@/components/ui/card'; // Imported Card

interface Goal {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  type: 'daily' | 'weekly' | 'monthly' | '3-month' | '6-month' | '9-month' | 'yearly' | '3-year' | '5-year' | '7-year' | '10-year';
  due_date: string | null;
  completed: boolean;
  order: number | null;
  parent_goal_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AISuggestionResult {
  cleanedDescription: string;
  description: string | null;
  category: string;
  type: Goal['type'];
  dueDate: string | null;
  parentGoalId: string | null;
}

interface ResonanceGoalsPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const fetchGoals = async (userId: string): Promise<Goal[]> => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });
  if (error) throw error;
  return data;
};

const createGoal = async (userId: string, goalData: Partial<Goal>): Promise<Goal> => {
  const { data, error } = await supabase
    .from('goals')
    .insert({ ...goalData, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

const updateGoal = async (goalId: string, updates: Partial<Goal>): Promise<Goal> => {
  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', goalId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

const deleteGoal = async (goalId: string): Promise<void> => {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId);
  if (error) throw error;
};

const suggestGoalDetails = async (prompt: string, categories: Category[], currentDate: Date): Promise<AISuggestionResult | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('suggest-goal-details', {
      body: JSON.stringify({
        text: prompt, // Changed from 'prompt' to 'text' to match the Edge Function
        categories: categories.map(c => ({ name: c.name })),
        currentDate: format(currentDate, 'yyyy-MM-dd'),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (error) {
      console.error('Error invoking Edge Function:', error.message);
      if ((error as any).details) {
        console.error('Edge Function details:', (error as any).details);
      }
      return null;
    }
    return data as AISuggestionResult;
  } catch (error) {
    console.error('API: Error in suggestGoalDetails:', error);
    return null;
  }
};

const ResonanceGoalsPage: React.FC<ResonanceGoalsPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = isDemo ? demoUserId : user?.id; // Use demoUserId if in demo mode
  const currentDate = new Date();

  const { allCategories, createCategory, updateCategory, deleteCategory } = useTasks({ currentDate, userId });

  const { data: goals, isLoading, error, refetch } = useQuery<Goal[], Error>({
    queryKey: ['goals', userId],
    queryFn: () => fetchGoals(userId!),
    enabled: !!userId,
  });

  const [newGoalText, setNewGoalText] = useState('');
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const handleCreateGoal = useCallback(async () => {
    if (!userId || !newGoalText.trim()) return;
    const toastId = showLoading('Creating goal...');
    try {
      const newGoal: Partial<Goal> = {
        title: newGoalText.trim(),
        type: 'monthly', // Default type
        completed: false,
      };
      await createGoal(userId, newGoal);
      showSuccess('Goal created!');
      setNewGoalText('');
      refetch();
    } catch (err: any) {
      showError(`Failed to create goal: ${err.message}`);
    } finally {
      dismissToast(toastId);
    }
  }, [userId, newGoalText, refetch]);

  const handleSuggestGoal = useCallback(async () => {
    if (!userId || !newGoalText.trim()) {
      showError('Please enter a goal description to get suggestions.');
      return;
    }
    const toastId = showLoading('Getting AI suggestions...');
    try {
      const suggestions = await suggestGoalDetails(newGoalText, allCategories, currentDate);
      if (suggestions) {
        const category = allCategories.find(c => c.name.toLowerCase() === suggestions.category.toLowerCase());
        const newGoal: Partial<Goal> = {
          title: suggestions.cleanedDescription,
          description: suggestions.description,
          category_id: category?.id || null,
          type: suggestions.type,
          due_date: suggestions.dueDate,
          completed: false,
          parent_goal_id: suggestions.parentGoalId,
        };
        await createGoal(userId, newGoal);
        showSuccess('AI suggested goal created!');
        setNewGoalText('');
        refetch();
      } else {
        showError('Failed to get AI suggestions.');
      }
    } catch (err: any) {
      showError(`Failed to get AI suggestions: ${err.message}`);
    } finally {
      dismissToast(toastId);
    }
  }, [userId, newGoalText, allCategories, currentDate, refetch]);

  if (!userId) {
    return <div className="p-4 text-center text-muted-foreground">Please log in to manage your resonance goals.</div>;
  }

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading goals...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-destructive">Error loading goals: {error.message}</div>;
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Resonance Goals</h1>

      <div className="flex items-center gap-2 mb-4">
        <Input
          placeholder="Add a new resonance goal..."
          value={newGoalText}
          onChange={(e) => setNewGoalText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateGoal()}
          className="flex-grow"
        />
        <Button onClick={handleSuggestGoal} disabled={!newGoalText.trim()}>
          <Lightbulb className="h-4 w-4 mr-2" /> AI Suggest
        </Button>
        <Button onClick={handleCreateGoal} disabled={!newGoalText.trim()}>
          <Plus className="h-4 w-4 mr-2" /> Add Goal
        </Button>
        <Button variant="outline" size="icon" onClick={() => setIsManageCategoriesOpen(true)}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={allCategories}
        onCategoryCreated={createCategory}
        onCategoryUpdated={updateCategory}
        onCategoryDeleted={deleteCategory}
      />

      {goals && goals.length > 0 ? (
        <div className="space-y-4">
          {goals.map(goal => (
            <Card key={goal.id} className={cn("p-4", goal.completed && "opacity-70")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={goal.completed}
                    onChange={async (e) => {
                      await updateGoal(goal.id, { completed: e.target.checked });
                      refetch();
                    }}
                    className="h-4 w-4"
                  />
                  <h3 className={cn("font-semibold", goal.completed && "line-through")}>{goal.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {goal.due_date && (
                    <span className="text-sm text-muted-foreground">Due: {format(parseISO(goal.due_date), 'MMM d, yyyy')}</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      await deleteGoal(goal.id);
                      showSuccess('Goal deleted!');
                      refetch();
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {goal.description && <p className="text-sm text-muted-foreground mt-2">{goal.description}</p>}
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground mt-8">No goals set yet. Start adding some!</p>
      )}
    </div>
  );
};

export default ResonanceGoalsPage;