import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Settings, Sparkles, LayoutGrid } from 'lucide-react';
import { useResonanceGoals, Goal, GoalType, NewGoalData, Category } from '@/hooks/useResonanceGoals';
import ResonanceGoalTimelineSection from '@/components/ResonanceGoalTimelineSection';
import FloatingAddGoalButton from '@/components/FloatingAddGoalButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import GoalForm, { GoalFormData } from '@/components/GoalForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerDescription } from '@/components/ui/drawer';
import { useSettings } from '@/context/SettingsContext';
import {
  DndContext,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
  PointerSensor,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import ResonanceGoalCard from '@/components/ResonanceGoalCard';
import { Skeleton } from '@/components/ui/skeleton';
import { getRandomTagColor } from '@/lib/tagColors'; // Reusing tagColors for categories
import ManageCategoriesDialog from '@/components/ManageCategoriesDialog'; // Reusing task categories dialog
import { showSuccess, showError } from '@/utils/toast';

const goalTypes: GoalType[] = ['daily', 'weekly', 'monthly', '3-month', '6-month', '9-month', 'yearly', '3-year', '5-year', '7-year', '10-year'];

interface ResonanceGoalsPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const ResonanceGoalsPage: React.FC<ResonanceGoalsPageProps> = ({ isDemo = false, demoUserId }) => {
  const userId = demoUserId; // In demo mode, use demoUserId, otherwise use auth user ID
  const { goals, categories, loading, addGoal, updateGoal, deleteGoal, addCategory } = useResonanceGoals({ userId });
  const { settings } = useSettings(); // Keep settings for potential future use, even if not directly used now
  const isMobile = useIsMobile();

  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [preselectedGoalType, setPreselectedGoalType] = useState<GoalType>('monthly');
  const [parentGoalForNew, setParentGoalForNew] = useState<string | null>(null);

  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});

  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const handleOpenGoalForm = (goal: Goal | null, type: GoalType = 'monthly', parentId: string | null = null) => {
    if (isDemo) return;
    setEditingGoal(goal);
    setPreselectedGoalType(type);
    setParentGoalForNew(parentId);
    setIsGoalFormOpen(true);
  };

  const handleSaveGoal = async (goalData: NewGoalData) => {
    if (isDemo) return false;
    let success = false;
    if (editingGoal) {
      const updates: Partial<NewGoalData> = {
        title: goalData.title,
        description: goalData.description,
        category_id: goalData.category_id,
        type: goalData.type,
        due_date: goalData.due_date,
        parent_goal_id: goalData.parent_goal_id,
        completed: goalData.completed,
        order: goalData.order,
      };
      const updated = await updateGoal({ id: editingGoal.id, updates });
      success = !!updated;
    } else {
      const added = await addGoal(goalData);
      success = !!added;
    }
    if (success) {
      setIsGoalFormOpen(false);
      setEditingGoal(null);
      setParentGoalForNew(null);
    }
    return success;
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
    if (isDemo) return;
    const parentGoal = goals.find(g => g.id === parentGoalId);
    if (parentGoal) {
      handleOpenGoalForm(null, parentGoal.type, parentGoalId);
    }
  };

  const toggleExpandGoal = (goalId: string) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: prev[goalId] === false ? true : false, // Toggle between true/false
    }));
  };

  const handleAddCategory = async (name: string, color: string) => {
    if (isDemo) return null;
    try {
      const newCategory = await addCategory({ name, color });
      showSuccess('Category added!');
      return newCategory;
    } catch (error) {
      showError('Failed to add category.');
      console.error(error);
      return null;
    }
  };

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

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeGoalData, setActiveGoalData] = useState<Goal | null>(null);

  const allSortableGoalIds = useMemo(() => {
    const ids: UniqueIdentifier[] = [];
    const addGoalsRecursively = (goalList: Goal[]) => {
      goalList.forEach(goal => {
        ids.push(goal.id);
        if (expandedGoals[goal.id] !== false) { // Only add sub-goals if expanded
          const subGoals = goals.filter(g => g.parent_goal_id === goal.id)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          addGoalsRecursively(subGoals);
        }
      });
    };

    goalTypes.forEach(type => {
      const topLevelGoalsForType = goals.filter(g => g.type === type && g.parent_goal_id === null)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
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

    if (!activeGoal || !overGoal) return;

    // Determine new parent and section
    let newParentId: string | null = null;
    let newOrder: number | null = null;

    // If dropping onto another goal, it becomes a sibling or a child
    if (overGoal) {
      // Check if it's being dropped as a child (e.g., if overGoal is expanded)
      // For simplicity, let's assume dropping on a goal makes it a sibling for now.
      // More complex logic would be needed for nested dragging.
      newParentId = overGoal.parent_goal_id;
    }

    const siblings = goals.filter(g => g.parent_goal_id === newParentId && g.type === activeGoal.type);
    const oldIndex = siblings.findIndex(g => g.id === active.id);
    const newIndex = siblings.findIndex(g => g.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedSiblings = arrayMove(siblings, oldIndex, newIndex);
      const updates = reorderedSiblings.map((g: Goal, idx: number) => ({
        id: g.id,
        order: idx,
      }));

      // Perform batch update for order
      await Promise.all(updates.map((u: { id: string; order: number | null; }) => updateGoal({ id: u.id, updates: { order: u.order } })));
    }

    // If the parent or type changed, update those as well
    if (activeGoal.parent_goal_id !== newParentId || activeGoal.type !== overGoal.type) {
      await updateGoal({
        id: activeGoal.id,
        updates: {
          parent_goal_id: newParentId,
          type: overGoal.type, // Assume type changes to the overGoal's type
          order: newOrder, // Reset order or calculate new order within new context
        },
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderGoalForm = () => {
    const FormComponent = isMobile ? Drawer : Dialog;
    const ContentComponent = isMobile ? DrawerContent : DialogContent;
    const HeaderComponent = isMobile ? DrawerHeader : DialogHeader;
    const TitleComponent = isMobile ? DrawerTitle : DialogTitle;
    const DescriptionComponent = isMobile ? DrawerDescription : DialogDescription;
    const FooterComponent = isMobile ? DrawerFooter : DialogFooter;

    return (
      <FormComponent open={isGoalFormOpen} onOpenChange={setIsGoalFormOpen}>
        <ContentComponent className={isMobile ? "h-full sm:max-w-md" : "sm:max-w-md"}>
          <HeaderComponent className={isMobile ? "text-left" : undefined}>
            <TitleComponent>{editingGoal ? 'Edit Goal' : 'Add New Goal'}</TitleComponent>
            <DescriptionComponent className="sr-only">
              {editingGoal ? 'Edit the details of your resonance goal.' : 'Fill in the details to add a new resonance goal.'}
            </DescriptionComponent>
          </HeaderComponent>
          <div className={isMobile ? "px-4 pb-4 overflow-y-auto flex-1" : "py-4"}>
            <GoalForm
              initialData={editingGoal}
              onSave={handleSaveGoal}
              onCancel={() => setIsGoalFormOpen(false)}
              allCategories={categories}
              autoFocus
              preselectedType={preselectedGoalType}
              parentGoalId={parentGoalForNew}
            />
          </div>
          {isMobile && <FooterComponent />}
        </ContentComponent>
      </FormComponent>
    );
  };

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Resonance Goals</h1>
          <p className="text-lg text-muted-foreground">Align your actions with your long-term vision.</p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button onClick={() => setIsManageCategoriesOpen(true)} variant="outline">
            <LayoutGrid className="mr-2 h-4 w-4" /> Manage Categories
          </Button>
          <Button onClick={() => handleOpenGoalForm(null, 'monthly')} disabled={isDemo}>
            <Plus className="mr-2 h-4 w-4" /> Add Goal
          </Button>
        </div>
      </div>

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
            {activeGoalData && (
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
                  level={0}
                />
              </div>
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      {renderGoalForm()}

      <FloatingAddGoalButton onClick={() => handleOpenGoalForm(null, 'monthly')} isDemo={isDemo} />

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={categories}
        onCategoryCreated={() => {}} // Invalidate query handled by hook
        onCategoryDeleted={() => {}} // Invalidate query handled by hook
      />
    </div>
  );
};

export default ResonanceGoalsPage;