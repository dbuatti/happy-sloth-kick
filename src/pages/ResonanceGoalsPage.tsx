import React, { useState, useMemo } from 'react';
import { Plus, LayoutGrid } from 'lucide-react';
import { useResonanceGoals, Goal, GoalType, NewGoalData } from '@/hooks/useResonanceGoals';
import ResonanceGoalTimelineSection from '@/components/ResonanceGoalTimelineSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import GoalForm from '@/components/GoalForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerDescription } from '@/components/ui/drawer';
import { useSettings } from '@/context/SettingsContext';
import { UniqueIdentifier } from '@dnd-kit/core';
import ManageCategoriesDialog from '@/components/ManageCategoriesDialog'; // Reusing task categories dialog
import { getRandomTagColor } from '@/lib/tagColors'; // Reusing tagColors for categories

const ResonanceGoalsPage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const { goals, categories, loading, addGoal, updateGoal, deleteGoal, addCategory } = useResonanceGoals({ userId });
  const { settings } = useSettings(); // Keep settings for potential future use, even if not directly used now
  const isMobile = useIsMobile();

  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [preselectedGoalType, setPreselectedGoalType] = useState<GoalType>('monthly');
  const [parentGoalIdForNew, setParentGoalIdForNew] = useState<string | null>(null);

  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});

  const toggleExpandGoal = (goalId: string) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: prev[goalId] === false ? true : false, // Toggle between true/false, default to true if undefined
    }));
  };

  const handleOpenGoalForm = (goal: Goal | null, type: GoalType = 'monthly', parentId: string | null = null) => {
    setEditingGoal(goal);
    setPreselectedGoalType(type);
    setParentGoalIdForNew(parentId);
    setIsGoalFormOpen(true);
  };

  const handleSaveGoal = async (goalData: NewGoalData) => {
    if (!userId) return false;
    if (editingGoal) {
      await updateGoal({ id: editingGoal.id, updates: goalData });
    } else {
      await addGoal(goalData);
    }
    return true;
  };

  const handleToggleCompleteGoal = async (goalId: string, completed: boolean) => {
    if (!userId) return;
    await updateGoal({ id: goalId, updates: { completed } });
  };

  const handleAddSubGoal = (parentGoalId: string) => {
    handleOpenGoalForm(null, 'daily', parentGoalId); // Default sub-goals to daily, can be changed in form
  };

  const handleAddCategory = async (name: string, color: string) => {
    if (!userId) return null;
    return addCategory({ name, color });
  };

  const handleCategoryCreated = () => {
    // Categories are refetched by useResonanceGoals hook due to real-time subscription
  };

  const handleCategoryDeleted = (deletedId: string) => {
    // Categories are refetched by useResonanceGoals hook due to real-time subscription
    // If the deleted category was selected in an open form, reset it.
    if (editingGoal?.category_id === deletedId) {
      setEditingGoal(prev => prev ? { ...prev, category_id: null } : null);
    }
  };

  const groupedGoals = useMemo(() => {
    const groups: Record<GoalType, Goal[]> = {
      'daily': [], 'weekly': [], 'monthly': [], '3-month': [], '6-month': [],
      '9-month': [], 'yearly': [], '3-year': [], '5-year': [], '7-year': [], '10-year': []
    };

    goals.forEach(goal => {
      if (groups[goal.type]) {
        groups[goal.type].push(goal);
      }
    });
    return groups;
  }, [goals]);

  const goalTypes: GoalType[] = [
    'daily', 'weekly', 'monthly', '3-month', '6-month',
    '9-month', 'yearly', '3-year', '5-year', '7-year', '10-year'
  ];

  const TitleContent = ({ isDrawer = false }: { isDrawer?: boolean }) => {
    const TitleComponent = isDrawer ? DrawerTitle : DialogTitle;
    return (
      <TitleComponent className="flex items-center gap-2">
        <LayoutGrid className="h-6 w-6 text-primary" />
        <span className="flex-1 truncate">{editingGoal ? 'Edit Goal' : 'Add New Goal'}</span>
      </TitleComponent>
    );
  };

  const FormContent = () => (
    <GoalForm
      initialData={editingGoal}
      onSave={handleSaveGoal}
      onCancel={() => setIsGoalFormOpen(false)}
      allCategories={categories}
      autoFocus
      preselectedType={preselectedGoalType}
      parentGoalId={parentGoalIdForNew}
    />
  );

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Resonance Goals</h1>
          <p className="text-lg text-muted-foreground">Align your actions with your long-term vision.</p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button onClick={() => handleOpenGoalForm(null)} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" /> Add Goal
          </Button>
          <Button variant="outline" onClick={() => setIsManageCategoriesOpen(true)} disabled={loading}>
            <LayoutGrid className="mr-2 h-4 w-4" /> Manage Categories
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
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
        <div className="space-y-8">
          {goalTypes.map(type => (
            <ResonanceGoalTimelineSection
              key={type}
              goalType={type}
              goals={groupedGoals[type]}
              allCategories={categories}
              onAddGoal={handleSaveGoal}
              onEditGoal={(goal) => handleOpenGoalForm(goal, goal.type, goal.parent_goal_id)}
              onDeleteGoal={deleteGoal}
              onToggleCompleteGoal={handleToggleCompleteGoal}
              onAddSubGoal={handleAddSubGoal}
              isDemo={false} // Assuming not in demo mode for this page
              loading={loading}
              expandedGoals={expandedGoals}
              toggleExpandGoal={toggleExpandGoal}
              onAddCategory={handleAddCategory}
            />
          ))}
        </div>
      )}

      {isMobile ? (
        <Drawer open={isGoalFormOpen} onOpenChange={setIsGoalFormOpen}>
          <DrawerContent className="z-[9999] bg-background">
            <DrawerHeader className="text-left">
              <TitleContent isDrawer />
              <DrawerDescription className="sr-only">
                {editingGoal ? 'Edit the details of your goal.' : 'Fill in the details to add a new goal.'}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto">
              <FormContent />
            </div>
            <DrawerFooter>
              <Button variant="outline" onClick={() => setIsGoalFormOpen(false)}>Cancel</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isGoalFormOpen} onOpenChange={setIsGoalFormOpen}>
          <DialogContent className="sm:max-w-md z-[9999] bg-background">
            <DialogHeader>
              <TitleContent />
              <DialogDescription className="sr-only">
                {editingGoal ? 'Edit the details of your goal.' : 'Fill in the details to add a new goal.'}
              </DialogDescription>
            </DialogHeader>
            <FormContent />
          </DialogContent>
        </Dialog>
      )}

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