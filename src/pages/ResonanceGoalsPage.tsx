import React, { useState, useMemo, useCallback } from 'react';
import { useGoals, Goal, NewGoalData } from '@/hooks/useGoals';
import { useTasks, Task, Category } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { PlusCircle, Target, ChevronRight, ChevronDown, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import GoalFormDialog from '@/components/GoalFormDialog';
import GoalDetailDialog from '@/components/GoalDetailDialog';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';
import ManageCategoriesDialog from '@/components/ManageCategoriesDialog';
import { showError, showSuccess } from '@/utils/toast';

interface ResonanceGoalsPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const ResonanceGoalsPage: React.FC<ResonanceGoalsPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const { settings } = useSettings();

  const {
    goals,
    loading: goalsLoading,
    createGoal,
    updateGoal,
    deleteGoal,
    updateGoalOrder,
  } = useGoals({ userId: userId || '' });

  const {
    allCategories,
    loading: categoriesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useTasks({ currentDate: new Date(), userId: userId || '' }); // Using useTasks to get category functions

  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isGoalDetailOpen, setIsGoalDetailOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryColor, setEditingCategoryColor] = useState('');

  const defaultColors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#06B6D4',
    '#0EA5E9', '##3B82F6', '#6366F1', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#78716C',
  ];

  const handleOpenGoalForm = (goal?: Goal) => {
    setEditingGoal(goal || null);
    setIsGoalFormOpen(true);
  };

  const handleCloseGoalForm = () => {
    setIsGoalFormOpen(false);
    setEditingGoal(null);
  };

  const handleSaveGoal = async (goalData: NewGoalData) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    if (editingGoal) {
      await updateGoal(editingGoal.id, goalData);
    } else {
      await createGoal(goalData);
    }
    handleCloseGoalForm();
  };

  const handleOpenGoalDetail = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsGoalDetailOpen(true);
  };

  const handleCloseGoalDetail = () => {
    setIsGoalDetailOpen(false);
    setSelectedGoal(null);
  };

  const toggleGoalExpansion = useCallback((goalId: string) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  }, []);

  const getSubGoals = useCallback((parentId: string) => {
    return goals.filter(goal => goal.parent_goal_id === parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [goals]);

  const getCategoryName = useCallback((categoryId: string | null) => {
    return allCategories.find(cat => cat.id === categoryId)?.name || 'Uncategorized';
  }, [allCategories]);

  const getCategoryColor = useCallback((categoryId: string | null) => {
    return allCategories.find(cat => cat.id === categoryId)?.color || '#9ca3af'; // Default gray
  }, [allCategories]);

  const handleCategoryCreated = () => {
    // No specific action needed here, as categories are refetched by useTasks
  };

  const handleCategoryDeleted = (_deletedId?: string) => { // Adjusted signature
    // No specific action needed here, as categories are refetched by useTasks
  };

  const handleCreateCategory = async () => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    if (!newCategoryName.trim()) {
      showError('Category name cannot be empty.');
      return;
    }
    try {
      await createCategory({ name: newCategoryName.trim(), color: newCategoryColor });
      showSuccess('Category created!');
      setNewCategoryName('');
      setNewCategoryColor(defaultColors[0]);
      handleCategoryCreated();
    } catch (error) {
      console.error('Error creating category:', error);
      showError('Failed to create category.');
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryColor(category.color);
  };

  const handleSaveCategoryEdit = async (categoryId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    if (!editingCategoryName.trim()) {
      showError('Category name cannot be empty.');
      return;
    }
    try {
      await updateCategory({ id: categoryId, updates: { name: editingCategoryName.trim(), color: editingCategoryColor } });
      showSuccess('Category updated!');
      setEditingCategoryId(null);
      setEditingCategoryName('');
      setEditingCategoryColor('');
    } catch (error) {
      console.error('Error updating category:', error);
      showError('Failed to update category.');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this category? All goals associated with it will lose their category.')) {
      try {
        await deleteCategory(categoryId);
        showSuccess('Category deleted!');
        handleCategoryDeleted(categoryId);
      } catch (error) {
        console.error('Error deleting category:', error);
        showError('Failed to delete category.');
      }
    }
  };

  const renderGoal = (goal: Goal, level: number) => {
    const subGoals = getSubGoals(goal.id);
    const isExpanded = expandedGoals[goal.id];
    const hasSubGoals = subGoals.length > 0;

    return (
      <li key={goal.id} className="mb-2">
        <div
          className={cn(
            "flex items-center justify-between p-3 rounded-lg shadow-sm border bg-card hover:bg-accent/50 transition-colors cursor-pointer",
            level > 0 && "ml-6"
          )}
          style={{ borderColor: getCategoryColor(goal.category_id) }}
          onClick={() => handleOpenGoalDetail(goal)}
        >
          <div className="flex items-center flex-grow min-w-0">
            {hasSubGoals && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 mr-2 flex-shrink-0"
                onClick={(e) => { e.stopPropagation(); toggleGoalExpansion(goal.id); }}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
            <div className="flex-grow min-w-0">
              <h4 className="font-medium text-lg truncate">{goal.title}</h4>
              <p className="text-sm text-muted-foreground truncate">{goal.description}</p>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <span className="mr-2 px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: getCategoryColor(goal.category_id) }}>
                  {getCategoryName(goal.category_id)}
                </span>
                {goal.due_date && (
                  <span>Due: {new Date(goal.due_date).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenGoalForm(goal); }}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteGoal(goal.id); }} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); updateGoal(goal.id, { completed: !goal.completed }); }}
              className={cn(goal.completed ? "text-green-500" : "text-muted-foreground")}
            >
              {goal.completed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {hasSubGoals && isExpanded && (
          <ul className="mt-2 space-y-2">
            {subGoals.map(subGoal => renderGoal(subGoal, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  const topLevelGoals = useMemo(() => {
    return goals.filter(goal => goal.parent_goal_id === null)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [goals]);

  if (goalsLoading || categoriesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 lg:p-6">
      <h1 className="text-3xl font-bold mb-6">Resonance Goals</h1>

      <div className="flex justify-between items-center mb-6">
        <Button onClick={() => handleOpenGoalForm()} disabled={isDemo}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Goal
        </Button>
        <Button variant="outline" onClick={() => setIsManageCategoriesOpen(true)} disabled={isDemo}>
          <Palette className="mr-2 h-4 w-4" /> Manage Categories
        </Button>
      </div>

      {topLevelGoals.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No goals defined yet. Start by adding a new goal!</p>
      )}

      <ul className="space-y-4">
        {topLevelGoals.map(goal => renderGoal(goal, 0))}
      </ul>

      <GoalFormDialog
        isOpen={isGoalFormOpen}
        onClose={handleCloseGoalForm}
        onSave={handleSaveGoal}
        editingGoal={editingGoal}
        allGoals={goals}
        allCategories={allCategories}
        isDemo={isDemo}
      />

      {selectedGoal && (
        <GoalDetailDialog
          isOpen={isGoalDetailOpen}
          onClose={handleCloseGoalDetail}
          goal={selectedGoal}
          allGoals={goals}
          allCategories={allCategories}
          onUpdateGoal={updateGoal}
          onDeleteGoal={deleteGoal}
          onOpenGoalForm={handleOpenGoalForm}
          getCategoryName={getCategoryName}
          getCategoryColor={getCategoryColor}
          isDemo={isDemo}
        />
      )}

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={allCategories}
        onCategoryCreated={handleCategoryCreated}
        onCategoryDeleted={handleCategoryDeleted}
      />
    </div>
  );
};

export default ResonanceGoalsPage;