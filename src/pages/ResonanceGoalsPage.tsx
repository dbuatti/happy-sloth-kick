"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Target, LayoutGrid, Settings, Tag, Sparkles } from 'lucide-react';
import { useResonanceGoals, Goal, GoalType, Category } from '@/hooks/useResonanceGoals';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import ResonanceGoalTimelineSection from '@/components/ResonanceGoalTimelineSection';
import FloatingAddGoalButton from '@/components/FloatingAddGoalButton';
import GoalForm from '@/components/GoalForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getRandomCategoryColor } from '@/lib/categoryColors';
import { showError, showSuccess } from '@/utils/toast';
import ManageCategoriesDialog from '@/components/ManageCategoriesDialog';
import { invokeGoalRollover } from '@/integrations/supabase/api'; // Import the new function

interface ResonanceGoalsPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const goalTypeOrder: GoalType[] = [
  'daily', 'weekly', 'monthly', '3-month', '6-month', '9-month', 'yearly', '3-year', '5-year', '7-year', '10-year'
];

const ResonanceGoalsPage: React.FC<ResonanceGoalsPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const {
    goals,
    categories,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
    addCategory,
    deleteCategory,
  } = useResonanceGoals({ userId });

  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [preselectedGoalType, setPreselectedGoalType] = useState<GoalType>('monthly');
  const [parentGoalForSubGoal, setParentGoalForSubGoal] = useState<string | null>(null);

  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});

  // Invoke goal rollover on page load
  useEffect(() => {
    if (!isDemo && userId) {
      invokeGoalRollover();
    }
  }, [isDemo, userId]);

  const handleOpenGoalForm = (goal: Goal | null, type: GoalType = 'monthly', parentId: string | null = null) => {
    setEditingGoal(goal);
    setPreselectedGoalType(type);
    setParentGoalForSubGoal(parentId);
    setIsGoalFormOpen(true);
  };

  const handleSaveGoal = async (goalData: Parameters<typeof GoalForm>['0']['onSave'] extends (data: infer T) => any ? T : never) => {
    if (editingGoal) {
      await updateGoal({ id: editingGoal.id, updates: goalData });
    } else {
      await addGoal(goalData);
    }
    return true;
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (isDemo) {
      showError('Goal deletion is disabled in demo mode.');
      return;
    }
    await deleteGoal(goalId);
  };

  const handleToggleCompleteGoal = async (goalId: string, completed: boolean) => {
    if (isDemo) {
      showError('Goal completion is disabled in demo mode.');
      return;
    }
    await updateGoal({ id: goalId, updates: { completed } });
  };

  const handleAddSubGoal = (parentGoalId: string) => {
    const parentGoal = goals.find(g => g.id === parentGoalId);
    if (parentGoal) {
      handleOpenGoalForm(null, parentGoal.type, parentGoalId);
    } else {
      showError('Parent goal not found.');
    }
  };

  const handleAddCategory = async (name: string, color: string) => {
    if (isDemo) {
      showError('Category creation is disabled in demo mode.');
      return null;
    }
    try {
      const newCategory = await addCategory({ name, color });
      showSuccess('Category created!');
      return newCategory;
    } catch (error) {
      console.error('Error adding category:', error);
      showError('Failed to add category.');
      return null;
    }
  };

  const handleCategoryCreated = () => {
    // Categories hook will automatically refetch due to real-time subscription
  };

  const handleCategoryDeleted = async (deletedId: string) => {
    if (isDemo) {
      showError('Category deletion is disabled in demo mode.');
      return;
    }
    try {
      await deleteCategory(deletedId);
      showSuccess('Category deleted!');
    } catch (error) {
      console.error('Error deleting category:', error);
      showError('Failed to delete category.');
    }
  };

  const toggleExpandGoal = (goalId: string) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  };

  const goalsByTimeframe = useMemo(() => {
    const grouped = new Map<GoalType, Goal[]>();
    goalTypeOrder.forEach(type => grouped.set(type, [])); // Initialize all types

    goals.forEach(goal => {
      if (goal.parent_goal_id === null) { // Only consider top-level goals for grouping
        const type = goal.type;
        if (grouped.has(type)) {
          grouped.get(type)?.push(goal);
        } else {
          grouped.set(type, [goal]);
        }
      }
    });
    return grouped;
  }, [goals]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Resonance Goals</h1>
          <p className="text-lg text-muted-foreground">Align your actions with your long-term vision.</p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" onClick={() => setIsManageCategoriesOpen(true)} disabled={isDemo}>
            <Tag className="mr-2 h-4 w-4" /> Manage Categories
          </Button>
          <Button onClick={() => handleOpenGoalForm(null)} disabled={isDemo}>
            <Plus className="mr-2 h-4 w-4" /> Add Goal
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {goalTypeOrder.map(type => {
          const goalsForType = goalsByTimeframe.get(type) || [];
          return (
            <ResonanceGoalTimelineSection
              key={type}
              goalType={type}
              goals={goalsForType}
              allCategories={categories}
              onAddGoal={addGoal}
              onEditGoal={handleOpenGoalForm}
              onDeleteGoal={handleDeleteGoal}
              onToggleCompleteGoal={handleToggleCompleteGoal}
              onAddSubGoal={handleAddSubGoal}
              isDemo={isDemo}
              loading={loading}
              expandedGoals={expandedGoals}
              toggleExpandGoal={toggleExpandGoal}
              onAddCategory={handleAddCategory}
            />
          );
        })}
      </div>

      <FloatingAddGoalButton onClick={() => handleOpenGoalForm(null)} isDemo={isDemo} />

      <Dialog open={isGoalFormOpen} onOpenChange={setIsGoalFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Edit Goal' : 'Add New Goal'}</DialogTitle>
          </DialogHeader>
          <GoalForm
            initialData={editingGoal}
            onSave={handleSaveGoal}
            onCancel={() => setIsGoalFormOpen(false)}
            allCategories={categories}
            autoFocus
            preselectedType={preselectedGoalType}
            parentGoalId={parentGoalForSubGoal}
          />
        </DialogContent>
      </Dialog>

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={categories}
        onCategoryCreated={handleCategoryCreated}
        onCategoryDeleted={handleCategoryDeleted}
      />
    </div>
  );
};

export default ResonanceGoalsPage;