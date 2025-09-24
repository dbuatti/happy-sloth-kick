import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Filter, LayoutGrid, Target, Sparkles, ChevronsDownUp } from 'lucide-react';
import { useResonanceGoals, Goal, GoalType, Category } from '@/hooks/useResonanceGoals';
import ResonanceGoalTimelineSection from '@/components/ResonanceGoalTimelineSection';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import GoalForm from '@/components/GoalForm';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { suggestGoalDetails } from '@/integrations/supabase/api';
import { dismissToast, showError, showLoading } from '@/utils/toast';
import ManageCategoriesDialog from '@/components/ManageCategoriesDialog';
import { arrayMove } from '@dnd-kit/sortable';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, UniqueIdentifier, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import ResonanceGoalCard from '@/components/ResonanceGoalCard';
import { getRandomCategoryColor } from '@/lib/categoryColors';

const goalTypeOrder: GoalType[] = [
  'daily', 'weekly', 'monthly', '3-month', '6-month', '9-month', 'yearly', '3-year', '5-year', '7-year', '10-year'
];

const ResonanceGoalsPage: React.FC<{ isDemo?: boolean; demoUserId?: string }> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const { goals, categories, loading, addGoal, updateGoal, deleteGoal, addCategory, deleteCategory } = useResonanceGoals({ userId });
  const { settings } = useSettings();
  const isMobile = useIsMobile();

  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [parentGoalForSubGoal, setParentGoalForSubGoal] = useState<string | null>(null);

  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const [goalTitle, setGoalTitle] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);

  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<GoalType, boolean>>(() => {
    const initial: Record<GoalType, boolean> = {} as Record<GoalType, boolean>;
    goalTypeOrder.forEach(type => {
      initial[type] = true; // All sections expanded by default
    });
    return initial;
  });

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeItemData, setActiveItemData] = useState<Goal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const toggleExpandGoal = useCallback((goalId: string) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  }, []);

  const toggleExpandSection = useCallback((goalType: GoalType) => {
    setExpandedSections(prev => ({
      ...prev,
      [goalType]: !prev[goalType],
    }));
  }, []);

  const handleOpenGoalForm = (goal: Goal | null, parentId: string | null = null) => {
    setEditingGoal(goal);
    setParentGoalForSubGoal(parentId);
    setIsGoalFormOpen(true);
  };

  const handleSaveGoal = async (goalData: Parameters<typeof GoalForm>['0']['onSave'][0]) => {
    if (editingGoal) {
      await updateGoal({ id: editingGoal.id, updates: goalData });
    } else {
      await addGoal(goalData);
    }
    setIsGoalFormOpen(false);
  };

  const handleDeleteGoal = async (goalId: string) => {
    await deleteGoal(goalId);
  };

  const handleToggleCompleteGoal = async (goalId: string, completed: boolean) => {
    await updateGoal({ id: goalId, updates: { completed } });
  };

  const handleAddSubGoal = (parentGoalId: string) => {
    handleOpenGoalForm(null, parentGoalId);
  };

  const handleAddCategory = async (name: string, color: string) => {
    return await addCategory({ name, color });
  };

  const handleCategoryCreated = () => {
    // Categories are refetched by react-query automatically
  };

  const handleCategoryDeleted = (deletedId: string) => {
    // If a category is deleted, any goals using it will have category_id set to null
    // React-query will refetch goals and categories, updating the UI
  };

  const handleSuggestGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) {
      showError('Please enter a goal title to get suggestions.');
      return;
    }
    if (isDemo) {
      showError('AI suggestions are not available in demo mode.');
      return;
    }

    setIsSuggesting(true);
    const loadingToastId = showLoading('Generating AI suggestions...');

    try {
      const categoriesForAI = categories.map(cat => ({ id: cat.id, name: cat.name }));
      const suggestions = await suggestGoalDetails(goalTitle, categoriesForAI, new Date());
      dismissToast(loadingToastId);
      setIsSuggesting(false);

      if (suggestions) {
        setGoalTitle(suggestions.title); // Corrected
        setGoalDescription(suggestions.description || ''); // Corrected
        // Set other fields based on suggestions
        // For now, we'll just set title and description, and open the form
        handleOpenGoalForm(null); // Open form with pre-filled data
      } else {
        showError('Failed to get AI suggestions. Please try again.');
      }
    } catch (error) {
      dismissToast(loadingToastId);
      showError('An error occurred while getting AI suggestions.');
      console.error('AI Suggestion Error:', error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const [goalDescription, setGoalDescription] = useState(''); // State for AI suggested description

  const goalsByGoalType = useMemo(() => {
    const grouped = new Map<GoalType, Goal[]>();
    goalTypeOrder.forEach(type => grouped.set(type, [])); // Ensure all types are present

    goals.forEach(goal => {
      if (grouped.has(goal.type)) {
        grouped.get(goal.type)?.push(goal);
      } else {
        grouped.set(goal.type, [goal]);
      }
    });
    return grouped;
  }, [goals]);

  const allSortableGoalIds = useMemo(() => {
    const ids: UniqueIdentifier[] = [];
    goalTypeOrder.forEach(type => {
      const goalsInType = goalsByGoalType.get(type) || [];
      const topLevelGoalsInType = goalsInType.filter(g => g.parent_goal_id === null).sort((a, b) => (a.order || 0) - (b.order || 0));
      
      if (topLevelGoalsInType.length > 0 || (expandedSections[type] ?? true)) { // Only add type header if there are goals or section is expanded
        ids.push(type); // Add the goal type as a draggable item
      }

      if (expandedSections[type] ?? true) { // Only add goals if section is expanded
        const addGoalsRecursively = (goalsToAdd: Goal[]) => {
          goalsToAdd.forEach(goal => {
            ids.push(goal.id);
            if (expandedGoals[goal.id] !== false) { // Check if individual goal is expanded
              const subGoals = goalsInType.filter(sub => sub.parent_goal_id === goal.id).sort((a, b) => (a.order || 0) - (b.order || 0));
              if (subGoals.length > 0) {
                addSubgoalsRecursively(subGoals);
              }
            }
          });
        };
        addGoalsRecursively(topLevelGoalsInType);
      }
    });
    return ids;
  }, [goalsByGoalType, expandedGoals, expandedSections, goals]);

  const getGoalById = useCallback((id: UniqueIdentifier | null) => {
    if (!id) return undefined;
    return goals.find(g => g.id === id);
  }, [goals]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    setActiveItemData(getGoalById(event.active.id) || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveItemData(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeGoal = getGoalById(active.id);
    if (!activeGoal) return;

    let newParentId: string | null = null;
    let newGoalType: GoalType = activeGoal.type;
    let overGoalId: string | null = null;

    if (goalTypeOrder.includes(over.id as GoalType)) {
      // Dropped onto a goal type section header
      newGoalType = over.id as GoalType;
      newParentId = null; // Top-level goal in new section
    } else {
      // Dropped onto another goal
      const overGoal = getGoalById(over.id);
      if (overGoal) {
        // If dropping onto a goal, make it a sub-goal of that goal
        newParentId = overGoal.id;
        newGoalType = overGoal.type; // Inherit type from parent
        overGoalId = overGoal.id;
      }
    }

    // Update the goal's parent_goal_id, type, and order
    const oldIndex = allSortableGoalIds.indexOf(active.id);
    const newIndex = allSortableGoalIds.indexOf(over.id);
    const isDraggingDown = oldIndex < newIndex;

    const newOrderedGoals = arrayMove(goals, oldIndex, newIndex);

    // Filter goals to only include those of the new type and parent for reordering
    const siblings = newOrderedGoals.filter(g => g.type === newGoalType && g.parent_goal_id === newParentId);

    const updates = siblings.map((goal, index) => ({
      id: goal.id,
      order: index,
      type: newGoalType,
      parent_goal_id: newParentId,
    }));

    await updateGoal({ id: activeGoal.id, updates: { type: newGoalType, parent_goal_id: newParentId } });
    // Then update order for all affected siblings
    for (const update of updates) {
      await updateGoal({ id: update.id, updates: { order: update.order } });
    }
  };

  const renderContent = () => (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Resonance Goals</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => handleOpenGoalForm(null)} disabled={isDemo}>
            <Plus className="mr-2 h-4 w-4" /> Add Goal
          </Button>
          <Button variant="outline" size="icon" onClick={() => setIsManageCategoriesOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-6 p-4 border rounded-xl bg-card shadow-sm">
        <form onSubmit={handleSuggestGoal} className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
          <Input
            placeholder="Describe your goal (AI-powered)"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            className="flex-1 h-10 text-base"
            disabled={isSuggesting || isDemo}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSuggestGoal(e as any);
              }
            }}
          />
          <Button type="submit" className="whitespace-nowrap h-10 text-base" disabled={isSuggesting || isDemo || !goalTitle.trim()}>
            {isSuggesting ? <span className="animate-spin h-4 w-4 border-b-2 border-primary rounded-full" /> : 'Suggest'}
          </Button>
        </form>
        {goalDescription && (
          <p className="text-sm text-muted-foreground mt-2 ml-7">
            AI Suggestion: {goalDescription}
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={allSortableGoalIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-6">
              {goalTypeOrder.map(type => {
                const goalsForType = goalsByGoalType.get(type) || [];
                const topLevelGoalsForType = goalsForType.filter(g => g.parent_goal_id === null);

                // Only render section if there are goals or it's expanded
                if (topLevelGoalsForType.length === 0 && !(expandedSections[type] ?? true)) {
                  return null;
                }

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
                    onAddCategory={addCategory}
                  />
                );
              })}
            </div>
          </SortableContext>
          {createPortal(
            <DragOverlay dropAnimation={null}>
              {activeId && activeItemData && (
                <div className="rotate-2">
                  <ResonanceGoalCard
                    goal={activeItemData}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onToggleComplete={() => {}}
                    onAddSubGoal={() => {}}
                    subGoals={[]}
                    isExpanded={false}
                    toggleExpand={() => {}}
                    isDemo={isDemo}
                    level={0}
                  />
                </div>
              )}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      )}

      {isMobile ? (
        <Sheet open={isGoalFormOpen} onOpenChange={setIsGoalFormOpen}>
          <SheetContent className="h-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{editingGoal ? 'Edit Goal' : 'Add New Goal'}</SheetTitle>
              <DialogDescription className="sr-only">
                {editingGoal ? 'Edit the details of your goal.' : 'Fill in the details to add a new goal.'}
              </DialogDescription>
            </SheetHeader>
            <GoalForm
              initialData={editingGoal}
              onSave={handleSaveGoal}
              onCancel={() => setIsGoalFormOpen(false)}
              allCategories={categories}
              parentGoalId={parentGoalForSubGoal}
              prefilledTitle={goalTitle}
              prefilledDescription={goalDescription}
              onAddCategory={addCategory}
            />
          </SheetContent>
        </Sheet>
      ) : (
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
              parentGoalId={parentGoalForSubGoal}
              prefilledTitle={goalTitle}
              prefilledDescription={goalDescription}
              onAddCategory={addCategory}
            />
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