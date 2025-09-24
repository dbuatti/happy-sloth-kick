import React, { useState, useCallback } from 'react';
import { Goal, GoalType, NewGoalData, useResonanceGoals } from '@/hooks/useResonanceGoals';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import ResonanceGoalTimelineSection from '@/components/ResonanceGoalTimelineSection';
import FloatingAddGoalButton from '@/components/FloatingAddGoalButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import GoalForm from '@/components/GoalForm';
import ManageCategoriesDialog from '@/components/ManageCategoriesDialog';
import { showError, showSuccess } from '@/utils/toast';

interface ResonanceGoalsPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const ResonanceGoalsPage: React.FC<ResonanceGoalsPageProps> = ({ isDemo = false, demoUserId }) => {
  const {
    goals,
    categories,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
    addCategory,
  } = useResonanceGoals({ userId: demoUserId });

  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [preselectedGoalType, setPreselectedGoalType] = useState<GoalType>('monthly');
  const [parentGoalIdForNew, setParentGoalIdForNew] = useState<string | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [goalToDeleteId, setGoalToDeleteId] = useState<string | null>(null);
  const [goalToDeleteTitle, setGoalToDeleteTitle] = useState<string | null>(null);

  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});

  const toggleExpandGoal = useCallback((goalId: string) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  }, []);

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveGoal = async (goalData: NewGoalData) => {
    if (isDemo) {
      showError('Cannot save goals in demo mode.');
      return false;
    }
    setIsSaving(true);
    try {
      if (editingGoal) {
        await updateGoal({ id: editingGoal.id, updates: goalData });
      } else {
        await addGoal(goalData);
      }
      showSuccess('Goal saved successfully!');
      return true;
    } catch (error) {
      console.error('Error saving goal:', error);
      showError('Failed to save goal.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      setGoalToDeleteId(goalId);
      setGoalToDeleteTitle(goal.title);
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDeleteGoal = async () => {
    if (goalToDeleteId) {
      setIsSaving(true);
      await deleteGoal(goalToDeleteId);
      setIsSaving(false);
      setIsDeleteDialogOpen(false);
      setGoalToDeleteId(null);
      setGoalToDeleteTitle(null);
    }
  };

  const handleToggleCompleteGoal = async (goalId: string, completed: boolean) => {
    if (isDemo) {
      showError('Cannot update goals in demo mode.');
      return;
    }
    await updateGoal({ id: goalId, updates: { completed } });
  };

  const handleAddCategory = async (name: string, color: string) => {
    if (isDemo) {
      showError('Cannot add categories in demo mode.');
      return null;
    }
    return await addCategory({ name, color });
  };

  const handleOpenGoalForm = (goal: Goal | null, type: GoalType, parentId: string | null = null) => {
    setEditingGoal(goal);
    setPreselectedGoalType(type);
    setParentGoalIdForNew(parentId);
    setIsGoalFormOpen(true);
  };

  const goalTypes: GoalType[] = ['daily', 'weekly', 'monthly', '3-month', '6-month', '9-month', 'yearly', '3-year', '5-year', '7-year', '10-year'];

  return (
    <main className="flex-1 overflow-auto p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Resonance Goals</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsManageCategoriesOpen(true)} variant="outline">
            <Settings className="mr-2 h-4 w-4" /> Manage Categories
          </Button>
          <Button onClick={() => handleOpenGoalForm(null, 'monthly')} disabled={isDemo}>
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
            onAddGoal={handleSaveGoal}
            onEditGoal={(goal) => handleOpenGoalForm(goal, goal.type)}
            onDeleteGoal={handleDeleteClick}
            onToggleCompleteGoal={handleToggleCompleteGoal}
            onAddSubGoal={(parentGoalId) => handleOpenGoalForm(null, 'daily', parentGoalId)}
            isDemo={isDemo}
            loading={loading}
            expandedGoals={expandedGoals}
            toggleExpandGoal={toggleExpandGoal}
            onAddCategory={handleAddCategory}
          />
        ))}
      </div>

      <FloatingAddGoalButton onClick={() => handleOpenGoalForm(null, 'monthly')} isDemo={isDemo} />

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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the goal "{goalToDeleteTitle}" and any sub-goals associated with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGoal} disabled={isSaving}>
              {isSaving ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={categories}
        onCategoryCreated={() => {}} // Handled by react-query invalidation
        onCategoryDeleted={() => {}} // Handled by react-query invalidation
      />
    </main>
  );
};

export default ResonanceGoalsPage;