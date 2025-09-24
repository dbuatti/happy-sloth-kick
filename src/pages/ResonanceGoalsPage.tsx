import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Sparkles } from 'lucide-react';
import { useResonanceGoals, Goal, GoalType, Category } from '@/hooks/useResonanceGoals';
import ResonanceGoalTimelineSection from '@/components/ResonanceGoalTimelineSection';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import GoalForm, { GoalFormData } from '@/components/GoalForm';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, UniqueIdentifier, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { Skeleton } from '@/components/ui/skeleton';
import ResonanceGoalCard from '@/components/ResonanceGoalCard';
import { getRandomCategoryColor } from '@/lib/categoryColors';
import FloatingAddGoalButton from '@/components/FloatingAddGoalButton';

const goalTypes: GoalType[] = ['daily', 'weekly', 'monthly', '3-month', '6-month', '9-month', 'yearly', '3-year', '5-year', '7-year', '10-year'];

const ResonanceGoalsPage: React.FC<{ isDemo?: boolean; demoUserId?: string }> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const { goals, categories, loading, addGoal, updateGoal, deleteGoal, addCategory } = useResonanceGoals({ userId });
  const { settings } = useSettings();
  const isMobile = useIsMobile();

  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [preselectedGoalType, setPreselectedGoalType] = useState<GoalType>('monthly');
  const [preselectedParentGoalId, setPreselectedParentGoalId] = useState<string | null>(null);

  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});

  const toggleExpandGoal = useCallback((goalId: string) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  }, []);

  const handleOpenGoalForm = (goal: Goal | null, type: GoalType = 'monthly', parentId: string | null = null) => {
    setEditingGoal(goal);
    setPreselectedGoalType(type);
    setPreselectedParentGoalId(parentId);
    setIsGoalFormOpen(true);
  };

  const handleSaveGoal = async (goalData: GoalFormData) => {
    if (isDemo) return false;
    const payload: NewGoalData = {
      title: goalData.title,
      description: goalData.description,
      category_id: goalData.categoryId,
      type: goalData.type,
      due_date: goalData.dueDate,
      parent_goal_id: goalData.parentGoalId,
      completed: initialData?.completed ?? false, // Ensure completed is passed for updates
      order: initialData?.order ?? null, // Ensure order is passed for updates
    };

    if (editingGoal) {
      await updateGoal({ id: editingGoal.id, updates: payload });
    } else {
      await addGoal(payload);
    }
    return true;
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (isDemo) return;
    await deleteGoal(goalId);
  };

  const handleToggleCompleteGoal = async (goalId: string, completed: boolean) => {
    if (isDemo) return;
    await updateGoal({ id: goalId, updates: { completed } });
  };

  const handleAddSubGoal = (parentGoalId: string) => {
    const parentGoal = goals.find(g => g.id === parentGoalId);
    if (parentGoal) {
      handleOpenGoalForm(null, parentGoal.type, parentGoalId);
    }
  };

  const handleAddCategory = async (name: string, color: string) => {
    if (isDemo) return null;
    return await addCategory({ name, color });
  };

  // DND Logic
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeGoalData, setActiveGoalData] = useState<Goal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      enabled: !isDemo,
    })
  );

  const allSortableGoalIds = useMemo(() => {
    const ids: UniqueIdentifier[] = [];
    const addGoalsRecursively = (goalsToAdd: Goal[]) => {
      goalsToAdd.forEach(goal => {
        ids.push(goal.id);
        if (expandedGoals[goal.id] !== false) { // Only add subgoals if expanded
          const subGoals = goals.filter(sub => sub.parent_goal_id === goal.id).sort((a, b) => (a.order || 0) - (b.order || 0));
          if (subGoals.length > 0) {
            addGoalsRecursively(subGoals);
          }
        }
      });
    };

    goalTypes.forEach(type => {
      const topLevelGoalsForType = goals.filter(g => g.type === type && g.parent_goal_id === null).sort((a, b) => (a.order || 0) - (b.order || 0));
      addGoalsRecursively(topLevelGoalsForType);
    });
    return ids;
  }, [goals, expandedGoals]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    setActiveGoalData(goals.find(g => g.id === event.active.id) || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveGoalData(null);
    const { active, over } = event;

    if (!over || active.id === over.id || isDemo) {
      return;
    }

    const activeGoal = goals.find(g => g.id === active.id);
    const overGoal = goals.find(g => g.id === over.id);

    if (!activeGoal) return;

    let newParentId: string | null = null;
    let newGoalType: GoalType = activeGoal.type;
    let newOrder: number | null = null;

    if (overGoal) {
      // If dropping onto another goal, it becomes a sibling or a child
      // For simplicity, let's assume it becomes a sibling for now.
      // More complex logic would be needed to allow dropping as a child.
      newParentId = overGoal.parent_goal_id;
      newGoalType = overGoal.type;

      const siblings = goals.filter(g => g.parent_goal_id === newParentId && g.type === newGoalType).sort((a, b) => (a.order || 0) - (b.order || 0));
      const oldIndex = siblings.findIndex(g => g.id === active.id);
      const newIndex = siblings.findIndex(g => g.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedSiblings = arrayMove(siblings, oldIndex, newIndex);
        const updates = reorderedSiblings.map((g, idx) => ({
          id: g.id,
          order: idx,
        }));
        // Perform batch update for order
        await Promise.all(updates.map(u => updateGoal({ id: u.id, updates: { order: u.order } })));
      } else {
        // If dropping into a new position where it's not a direct sibling,
        // place it at the end of the target's siblings or section
        newOrder = (siblings.length > 0 ? Math.max(...siblings.map(s => s.order || 0)) : -1) + 1;
        await updateGoal({ id: activeGoal.id, updates: { parent_goal_id: newParentId, type: newGoalType, order: newOrder } });
      }
    } else {
      // Dropping into an empty section or at the end of a type
      // This part needs more specific drop targets if we want to drop into empty sections
      // For now, if no overGoal, assume it's dropped at the end of its current type
      const goalsOfType = goals.filter(g => g.type === activeGoal.type && g.parent_goal_id === null);
      newOrder = (goalsOfType.length > 0 ? Math.max(...goalsOfType.map(g => g.order || 0)) : -1) + 1;
      await updateGoal({ id: activeGoal.id, updates: { order: newOrder } });
    }
  };

  const renderContent = () => (
    <div className="flex-1 overflow-y-auto p-4">
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={allSortableGoalIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-6">
              {goalTypes.map(type => (
                <ResonanceGoalTimelineSection
                  key={type}
                  goalType={type}
                  goals={goals.filter(g => g.type === type)}
                  allCategories={categories}
                  onAddGoal={handleSaveGoal}
                  onEditGoal={(goal) => handleOpenGoalForm(goal, goal.type, goal.parent_goal_id)}
                  onDeleteGoal={handleDeleteGoal}
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
          </SortableContext>
          {createPortal(
            <DragOverlay dropAnimation={null}>
              {activeId && activeGoalData && (
                <div className="rotate-2">
                  <ResonanceGoalCard
                    goal={activeGoalData}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onToggleComplete={() => {}}
                    onAddSubGoal={() => {}}
                    subGoals={[]}
                    isExpanded={false}
                    toggleExpand={() => {}}
                    isDemo={true} // Render as demo/overlay
                  />
                </div>
              )}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> Resonance Goals
        </h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => handleOpenGoalForm(null, 'monthly')} disabled={isDemo}>
            <Plus className="mr-2 h-4 w-4" /> Add Goal
          </Button>
          <Button variant="outline" size="icon" onClick={() => console.log('Open settings')} disabled={isDemo}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {renderContent()}

      <FloatingAddGoalButton onClick={() => handleOpenGoalForm(null, 'monthly')} isDemo={isDemo} />

      <Dialog open={isGoalFormOpen} onOpenChange={setIsGoalFormOpen}>
        <DialogContent className={isMobile ? "h-full max-h-screen overflow-y-auto" : "sm:max-w-md"}>
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
            preselectedType={preselectedGoalType}
            parentGoalId={preselectedParentGoalId}
            autoFocus
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResonanceGoalsPage;