import React, { useState, useMemo, useCallback } from 'react';
import { Goal, GoalType, Category, NewGoalData, UpdateGoalData, useResonanceGoals } from '@/hooks/useResonanceGoals';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid } from 'lucide-react';
import ResonanceGoalTimelineSection from '@/components/ResonanceGoalTimelineSection';
import GoalForm from '@/components/GoalForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
import { useAuth } from '@/context/AuthContext';
import FloatingAddGoalButton from '@/components/FloatingAddGoalButton';
import ManageCategoriesDialog from '@/components/ManageCategoriesDialog';
import { getRandomTagColor } from '@/lib/tagColors'; // Using getRandomTagColor as a generic color utility

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
  } = useResonanceGoals({ userId: demoUserId });

  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [preselectedGoalType, setPreselectedGoalType] = useState<GoalType>('monthly');
  const [parentGoalIdForNew, setParentGoalIdForNew] = useState<string | null>(null);

  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [goalToDeleteId, setGoalToDeleteId] = useState<string | null>(null);
  const [goalToDeleteTitle, setGoalToDeleteTitle] = useState<string | null>(null);

  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});

  const handleOpenGoalForm = (goal: Goal | null, type: GoalType = 'monthly', parentId: string | null = null) => {
    setEditingGoal(goal);
    setPreselectedGoalType(type);
    setParentGoalIdForNew(parentId);
    setIsGoalFormOpen(true);
  };

  const handleSaveGoal = async (goalData: NewGoalData): Promise<any> => {
    if (!userId) return false;
    setIsSaving(true);
    try {
      if (editingGoal) {
        await updateGoal({ id: editingGoal.id, updates: goalData as UpdateGoalData });
      } else {
        await addGoal(goalData);
      }
      return true;
    } catch (error) {
      console.error('Error saving goal:', error);
      showError('Failed to save goal.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCompleteGoal = async (goalId: string, completed: boolean) => {
    if (isDemo) return;
    await updateGoal({ id: goalId, updates: { completed } });
  };

  const handleDeleteClick = (goalId: string, goalTitle: string) => {
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
      showError('Cannot add categories in demo mode.');
      return null;
    }
    return await addCategory({ name, color });
  };

  const handleCategoryCreated = () => {
    // Categories are refetched by useResonanceGoals's real-time subscription
  };

  const handleCategoryDeleted = () => {
    // Categories are refetched by useResonanceGoals's real-time subscription
  };

  const toggleExpandGoal = useCallback((goalId: string) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  }, []);

  const goalTypes: GoalType[] = ['daily', 'weekly', 'monthly', '3-month', '6-month', '9-month', 'yearly', '3-year', '5-year', '7-year', '10-year'];

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <LayoutGrid className="h-7 w-7 text-primary" /> Resonance Goals
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsManageCategoriesOpen(true)} disabled={isDemo}>
            Manage Categories
          </Button>
          <Button onClick={() => handleOpenGoalForm(null)} disabled={isDemo}>
            <Plus className="mr-2 h-4 w-4" /> Add Goal
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {goalTypes.map(type => (
          <ResonanceGoalTimelineSection
            key={type}
            goalType={type}
            goals={goals.filter(g => g.type === type)}
            allCategories={categories}
            onAddGoal={(goalData) => handleSaveGoal({ ...goalData, type })}
            onEditGoal={(goal) => handleOpenGoalForm(goal, goal.type)}
            onDeleteGoal={handleDeleteClick}
            onToggleCompleteGoal={handleToggleCompleteGoal}
            onAddSubGoal={(parentGoalId) => handleOpenGoalForm(null, type, parentGoalId)}
            isDemo={isDemo}
            loading={loading}
            expandedGoals={expandedGoals}
            toggleExpandGoal={toggleExpandGoal}
            onAddCategory={handleAddCategory}
          />
        ))}
      </div>

      <FloatingAddGoalButton onClick={() => handleOpenGoalForm(null)} isDemo={isDemo} />

      <Dialog open={isGoalFormOpen} onOpenChange={setIsGoalFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Edit Goal' : 'Add New Goal'}</DialogTitle>
            <DialogDescription className="sr-only">
              {editingGoal ? 'Edit the details of your goal.' : 'Fill in the details to add a new goal.'}
            </DialogDescription>
          </DialogHeader>
          <GoalForm
            initialData={editingGoal}
            onSave={handleSaveGoal}
            onCancel={() => setIsGoalFormOpen(false)}
            allCategories={categories}
            autoFocus
            preselectedType={preselectedGoalType}
            parentGoalId={parentGoalIdForNew}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDeleteDialog} onOpenChange={setShowConfirmDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the goal "{goalToDeleteTitle}" and any sub-goals associated with it.
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
    </main>
  );
};

export default ResonanceGoalsPage;