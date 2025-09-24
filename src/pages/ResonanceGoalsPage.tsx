import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Tag } from 'lucide-react'; 
import { useResonanceGoals, Goal, GoalType } from '@/hooks/useResonanceGoals'; 
import { useAuth } from '@/context/AuthContext';
import ResonanceGoalTimelineSection from '@/components/ResonanceGoalTimelineSection';
import GoalForm from '@/components/GoalForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getRandomCategoryColor } from '@/lib/categoryColors'; 
import { showError, showSuccess } from '@/utils/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ManageCategoriesDialog from '@/components/ManageCategoriesDialog'; 

const ResonanceGoalsPage: React.FC<{ isDemo?: boolean; demoUserId?: string }> = ({ isDemo = false, demoUserId }) => {
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
    updateCategory,
    deleteCategory,
  } = useResonanceGoals({ userId });

  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [parentGoalForSubGoal, setParentGoalForSubGoal] = useState<string | null>(null);
  const [preselectedGoalType, setPreselectedGoalType] = useState<GoalType>('monthly');

  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [goalToDeleteId, setGoalToDeleteId] = useState<string | null>(null);
  const [goalToDeleteTitle, setGoalToDeleteTitle] = useState<string | null>(null);

  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [categoryToDeleteId, setCategoryToDeleteId] = useState<string | null>(null);
  const [categoryToDeleteName, setCategoryToDeleteName] = useState<string | null>(null);
  const [showConfirmDeleteCategoryDialog, setShowConfirmDeleteCategoryDialog] = useState(false);

  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});

  const toggleExpandGoal = (goalId: string) => {
    setExpandedGoals(prev => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  const handleOpenGoalForm = (goal: Goal | null, type: GoalType = 'monthly', parentId: string | null = null) => {
    if (isDemo) {
      showError('Goal management is not available in demo mode.');
      return;
    }
    setEditingGoal(goal);
    setPreselectedGoalType(type);
    setParentGoalForSubGoal(parentId);
    setIsGoalFormOpen(true);
  };

  const handleSaveGoal = async (goalData: Parameters<typeof GoalForm>['0']['onSave'] extends (data: infer T) => any ? T : never) => {
    try {
      if (editingGoal) {
        await updateGoal({ id: editingGoal.id, updates: goalData });
      } else {
        await addGoal(goalData);
      }
      setIsGoalFormOpen(false);
      showSuccess('Goal saved successfully!');
    } catch (error: any) {
      console.error('Error saving goal:', error);
      showError('Failed to save goal.');
    }
  };

  const handleDeleteGoalClick = (goalId: string, goalTitle: string) => {
    if (isDemo) {
      showError('Goal management is not available in demo mode.');
      return;
    }
    setGoalToDeleteId(goalId);
    setGoalToDeleteTitle(goalTitle);
    setShowConfirmDeleteDialog(true);
  };

  const confirmDeleteGoal = async () => {
    if (goalToDeleteId) {
      await deleteGoal(goalToDeleteId);
      setShowConfirmDeleteDialog(false);
      setGoalToDeleteId(null);
      setGoalToDeleteTitle(null);
    }
  };

  const handleAddCategory = async (name: string, color: string) => {
    if (isDemo) {
      showError('Category management is not available in demo mode.');
      return null;
    }
    try {
      const newCategory = await addCategory({ name, color });
      showSuccess('Category added!');
      return newCategory;
    } catch (error) {
      console.error('Error adding category:', error);
      showError('Failed to add category.');
      return null;
    }
  };

  const handleCategoryCreated = () => {
    // Categories are automatically refetched by react-query due to real-time subscription
    // No explicit action needed here other than potentially closing a form if it existed
  };

  const handleCategoryDeleted = (deletedId: string) => {
    // Categories are automatically refetched by react-query due to real-time subscription
    // If any goals were using this category, their category_id will be set to null by the RLS policy.
  };

  const goalTypes: GoalType[] = useMemo(() => [
    'daily', 'weekly', 'monthly', '3-month', '6-month', '9-month', 'yearly', '3-year', '5-year', '7-year', '10-year'
  ], []);

  const groupedGoals = useMemo(() => {
    const groups: Record<GoalType, Goal[]> = goalTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {} as Record<GoalType, Goal[]>);
    goals.forEach(goal => {
      if (goal.parent_goal_id === null) { // Only group top-level goals
        groups[goal.type]?.push(goal);
      }
    });
    return groups;
  }, [goals, goalTypes]);

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Resonance Goals</h1>
            <p className="text-lg text-muted-foreground">Align your actions with your long-term vision.</p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button onClick={() => handleOpenGoalForm(null)} disabled={isDemo}>
              <Plus className="mr-2 h-4 w-4" /> Add Goal
            </Button>
            <Button variant="outline" onClick={() => setIsManageCategoriesOpen(true)} disabled={isDemo}>
              <Tag className="mr-2 h-4 w-4" /> Manage Categories
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2 border-b pb-4 mb-4">
                <div className="h-6 w-48 bg-muted rounded-md" />
                <div className="h-20 w-full bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {goalTypes.map(type => (
              <ResonanceGoalTimelineSection
                key={type}
                goalType={type}
                goals={groupedGoals[type]}
                allCategories={categories}
                onAddGoal={addGoal}
                onEditGoal={(goal) => handleOpenGoalForm(goal, goal.type)}
                onDeleteGoal={handleDeleteGoalClick}
                onToggleCompleteGoal={async (goalId, completed) => {
                  if (isDemo) {
                    showError('Goal management is not available in demo mode.');
                    return;
                  }
                  await updateGoal({ id: goalId, updates: { completed } });
                }}
                onAddSubGoal={(parentGoalId) => handleOpenGoalForm(null, 'daily', parentGoalId)}
                isDemo={isDemo}
                loading={loading}
                expandedGoals={expandedGoals}
                toggleExpandGoal={toggleExpandGoal}
                onAddCategory={handleAddCategory}
              />
            ))}
          </div>
        )}
      </div>

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

      <AlertDialog open={showConfirmDeleteDialog} onOpenChange={setShowConfirmDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the goal "{goalToDeleteTitle}" and all its sub-goals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGoal}>
              Delete
            </AlertDialogAction>
          </DialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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