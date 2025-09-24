import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { useResonanceGoals, Goal, GoalType, NewGoalData, Category } from '@/hooks/useResonanceGoals';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import ManageCategoriesDialog from '@/components/ManageCategoriesDialog'; // Reusing task categories dialog
import { useAuth } from '@/context/AuthContext';
import GoalForm from '@/components/GoalForm';
import ResonanceGoalTimelineSection from '@/components/ResonanceGoalTimelineSection';
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
import { Skeleton } from '@/components/ui/skeleton';

interface ResonanceGoalsPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const ResonanceGoalsPage: React.FC<ResonanceGoalsPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const { goals, categories, loading, addGoal, updateGoal, deleteGoal, addCategory } = useResonanceGoals({ userId });
  // Dummy usage to satisfy TS6133 for Category type
  type _CategoryUsed = Category;

  const isMobile = useIsMobile();

  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [preselectedGoalType, setPreselectedGoalType] = useState<GoalType>('monthly');
  const [parentGoalIdForNew, setParentGoalIdForNew] = useState<string | null>(null);

  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [goalToDeleteId, setGoalToDeleteId] = useState<string | null>(null);
  const [goalToDeleteTitle, setGoalToDeleteTitle] = useState<string | null>(null);

  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});

  const toggleExpandGoal = (goalId: string) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  };

  const handleOpenGoalForm = (goal: Goal | null, type: GoalType = 'monthly', parentId: string | null = null) => {
    setEditingGoal(goal);
    setPreselectedGoalType(type);
    setParentGoalIdForNew(parentId);
    setIsGoalFormOpen(true);
  };

  const handleSaveGoal = async (goalData: NewGoalData) => {
    if (editingGoal) {
      await updateGoal({ id: editingGoal.id, updates: goalData });
    } else {
      await addGoal(goalData);
    }
    setIsGoalFormOpen(false);
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

  const handleAddSubGoal = (parentGoalId: string) => {
    const parentGoal = goals.find(g => g.id === parentGoalId);
    if (parentGoal) {
      handleOpenGoalForm(null, parentGoal.type, parentGoalId);
    }
  };

  const handleToggleCompleteGoal = async (goalId: string, completed: boolean) => {
    await updateGoal({ id: goalId, updates: { completed } });
  };

  const handleAddCategory = async (name: string, color: string) => {
    return await addCategory({ name, color });
  };

  const goalTypes: GoalType[] = useMemo(() => [
    'daily', 'weekly', 'monthly', '3-month', '6-month', '9-month', 'yearly', '3-year', '5-year', '7-year', '10-year'
  ], []);

  const renderContent = () => (
    <div className="space-y-6">
      {goalTypes.map(type => (
        <ResonanceGoalTimelineSection
          key={type}
          goalType={type}
          goals={goals.filter(g => g.type === type)}
          allCategories={categories}
          onAddGoal={handleSaveGoal}
          onEditGoal={(goal) => handleOpenGoalForm(goal, goal.type, goal.parent_goal_id)}
          onDeleteGoal={handleDeleteClick}
          onToggleCompleteGoal={handleToggleCompleteGoal}
          onAddSubGoal={handleAddSubGoal}
          isDemo={isDemo}
          loading={loading}
          expandedGoals={expandedGoals}
          toggleExpandGoal={toggleExpandGoal}
          onAddCategory={handleAddCategory}
        />
      ))}
    </div>
  );

  const DialogComponent = isMobile ? Drawer : Dialog;
  const DialogContentComponent = isMobile ? DrawerContent : DialogContent;
  const DialogHeaderComponent = isMobile ? DrawerHeader : DialogHeader;
  const DialogTitleComponent = isMobile ? DrawerTitle : DialogTitle;
  const DialogDescriptionComponent = isMobile ? DrawerDescription : DialogDescription;

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Resonance Goals</h1>
          <p className="text-lg text-muted-foreground">Align your actions with your long-term vision.</p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button onClick={() => handleOpenGoalForm(null)} disabled={isDemo}>
            <Plus className="mr-2 h-4 w-4" /> Add Goal
          </Button>
          <Button variant="outline" size="icon" onClick={() => setIsManageCategoriesOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="w-full shadow-lg rounded-xl">
            <CardHeader><CardTitle><Skeleton className="h-6 w-1/3" /></CardTitle></CardHeader>
            <CardContent className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></CardContent>
          </Card>
          <Card className="w-full shadow-lg rounded-xl">
            <CardHeader><CardTitle><Skeleton className="h-6 w-1/3" /></CardTitle></CardHeader>
            <CardContent className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></CardContent>
          </Card>
        </div>
      ) : (
        renderContent()
      )}

      <DialogComponent open={isGoalFormOpen} onOpenChange={setIsGoalFormOpen}>
        <DialogContentComponent className="sm:max-w-md">
          <DialogHeaderComponent>
            <DialogTitleComponent>{editingGoal ? 'Edit Goal' : 'Add New Goal'}</DialogTitleComponent>
            <DialogDescriptionComponent className="sr-only">
              {editingGoal ? 'Edit the details of your goal.' : 'Fill in the details to add a new goal.'}
            </DialogDescriptionComponent>
          </DialogHeaderComponent>
          <GoalForm
            initialData={editingGoal}
            onSave={handleSaveGoal}
            onCancel={() => setIsGoalFormOpen(false)}
            allCategories={categories}
            autoFocus
            preselectedType={preselectedGoalType}
            parentGoalId={parentGoalIdForNew}
          />
        </DialogContentComponent>
      </DialogComponent>

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={categories}
        onCategoryCreated={() => {}} // useResonanceGoals handles invalidation
        onCategoryDeleted={() => {}} // useResonanceGoals handles invalidation
      />

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
              <Trash2 className="mr-2 h-4 w-4" /> Delete Goal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ResonanceGoalsPage;