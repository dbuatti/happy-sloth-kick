import React, { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResonanceGoals, Goal, GoalType, Category } from '@/hooks/useResonanceGoals';
import { Skeleton } from '@/components/ui/skeleton';
import ResonanceGoalTimelineSection from '@/components/ResonanceGoalTimelineSection';
import FloatingAddGoalButton from '@/components/FloatingAddGoalButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import GoalForm from '@/components/GoalForm';
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
import { getRandomCategoryColor } from '@/lib/categoryColors'; // Assuming this utility exists
import ManageCategoriesDialog from '@/components/ManageCategoriesDialog';

interface ResonanceGoalsPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const goalTypes: GoalType[] = ['daily', 'weekly', 'monthly', '3-month', '6-month', '9-month', 'yearly', '3-year', '5-year', '7-year', '10-year'];

const ResonanceGoalsPage: React.FC<ResonanceGoalsPageProps> = ({ isDemo = false, demoUserId }) => {
  const {
    goals,
    categories,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
    addCategory,
    deleteCategory,
  } = useResonanceGoals({ userId: demoUserId });

  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [preselectedGoalType, setPreselectedGoalType] = useState<GoalType>('monthly');
  const [parentGoalIdForNew, setParentGoalIdForNew] = useState<string | null>(null);

  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [goalToDeleteId, setGoalToDeleteId] = useState<string | null>(null);
  const [goalToDeleteTitle, setGoalToDeleteTitle] = useState<string | null>(null);

  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const handleOpenGoalForm = (goal: Goal | null, type: GoalType = 'monthly', parentId: string | null = null) => {
    setEditingGoal(goal);
    setPreselectedGoalType(type);
    setParentGoalIdForNew(parentId);
    setIsGoalFormOpen(true);
  };

  const handleCloseGoalForm = () => {
    setIsGoalFormOpen(false);
    setEditingGoal(null);
    setParentGoalIdForNew(null);
  };

  const handleSaveGoal = async (goalData: Parameters<typeof addGoal>[0]) => {
    if (editingGoal) {
      await updateGoal({ id: editingGoal.id, updates: goalData });
    } else {
      await addGoal(goalData);
    }
    return true;
  };

  const handleDeleteClick = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      setGoalToDeleteId(goalId);
      setGoalToDeleteTitle(goal.title);
      setShowConfirmDeleteDialog(true);
    }
  };

  const confirmDeleteGoal = async () => {
    if (goalToDeleteId) {
      await deleteGoal(goalToDeleteId);
      setShowConfirmDeleteDialog(false);
      setGoalToDeleteId(null);
      setGoalToDeleteTitle(null);
    }
  };

  const handleToggleComplete = async (goalId: string, completed: boolean) => {
    await updateGoal({ id: goalId, updates: { completed } });
  };

  const handleAddSubGoal = (parentGoalId: string) => {
    const parentGoal = goals.find(g => g.id === parentGoalId);
    if (parentGoal) {
      handleOpenGoalForm(null, parentGoal.type, parentGoalId);
    }
  };

  const toggleExpandGoal = (goalId: string) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: prev[goalId] === undefined ? false : !prev[goalId],
    }));
  };

  const handleAddCategory = async (name: string, color: string) => {
    return await addCategory({ name, color });
  };

  const handleCategoryCreated = () => {
    // Categories are refetched by useResonanceGoals's real-time subscription
  };

  const handleCategoryDeleted = (deletedId: string) => {
    // Categories are refetched by useResonanceGoals's real-time subscription
    // Also need to update any goals that used this category
    goals.filter(g => g.category_id === deletedId).forEach(async g => {
      await updateGoal({ id: g.id, updates: { category_id: null } });
    });
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6 container mx-auto max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Target className="h-7 w-7 text-primary" /> Resonance Goals
        </h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsManageCategoriesOpen(true)} variant="outline">
            Manage Categories
          </Button>
          <Button onClick={() => handleOpenGoalForm(null)} disabled={isDemo}>
            <Plus className="mr-2 h-4 w-4" /> Add Goal
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {goalTypes.map(type => (
            <ResonanceGoalTimelineSection
              key={type}
              goalType={type}
              goals={goals.filter(g => g.type === type)}
              allCategories={categories}
              onAddGoal={(goalData) => handleSaveGoal(goalData)}
              onEditGoal={handleOpenGoalForm}
              onDeleteGoal={handleDeleteClick}
              onToggleCompleteGoal={handleToggleComplete}
              onAddSubGoal={handleAddSubGoal}
              isDemo={isDemo}
              loading={loading}
              expandedGoals={expandedGoals}
              toggleExpandGoal={toggleExpandGoal}
              onAddCategory={handleAddCategory}
            />
          ))}
        </div>
      )}

      <FloatingAddGoalButton onClick={() => handleOpenGoalForm(null)} isDemo={isDemo} />

      <Dialog open={isGoalFormOpen} onOpenChange={handleCloseGoalForm}>
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
            onCancel={handleCloseGoalForm}
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
          </AlertDialogFooter>
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