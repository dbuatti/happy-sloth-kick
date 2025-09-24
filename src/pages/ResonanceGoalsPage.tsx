import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, LayoutGrid, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResonanceGoals, Goal, GoalType, NewGoalData } from '@/hooks/useResonanceGoals';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
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
import FloatingAddGoalButton from '@/components/FloatingAddGoalButton';
import ResonanceGoalTimelineSection from '@/components/ResonanceGoalTimelineSection'; // Import the new component
import { suggestGoalDetails } from '@/integrations/supabase/api'; // Import suggestGoalDetails
import { dismissToast, showError, showLoading } from '@/utils/toast'; // Import toast utilities

interface ResonanceGoalsPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const goalTypes: { value: GoalType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: '3-month', label: '3-Month' },
  { value: '6-month', label: '6-Month' },
  { value: '9-month', label: '9-Month' },
  { value: 'yearly', label: 'Yearly' },
  { value: '3-year', label: '3-Year Vision' },
  { value: '5-year', label: '5-Year Vision' },
  { value: '7-year', label: '7-Year Vision' },
  { value: '10-year', label: '10-Year Vision' },
];

// Define the specific type of data expected from QuickAddGoal
type QuickAddGoalData = {
  title: string;
  description: string | null;
  category_id: string | null;
  type: GoalType;
  due_date: string | null;
  parent_goal_id: string | null;
};

const ResonanceGoalsPage: React.FC<ResonanceGoalsPageProps> = ({ isDemo = false, demoUserId }) => {
  const { goals, categories, loading, addGoal, updateGoal, deleteGoal, addCategory, deleteCategory } = useResonanceGoals({ userId: demoUserId });

  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalCategory, setGoalCategory] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('daily');
  const [goalDueDate, setGoalDueDate] = useState<Date | undefined>(undefined);
  const [goalParentId, setGoalParentId] = useState<string | null>(null); // New state for parent goal
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [isSuggestingGoal, setIsSuggestingGoal] = useState(false); // New state for AI suggestion

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [goalToDeleteId, setGoalToDeleteId] = useState<string | null>(null);

  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isCategoryDeleteConfirmOpen, setIsCategoryDeleteConfirmOpen] = useState(false);
  const [categoryToDeleteId, setCategoryToDeleteId] = useState<string | null>(null);
  const [categoryToDeleteName, setCategoryToDeleteName] = useState<string | null>(null);

  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('resonanceGoals_expandedGoals');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (isGoalFormOpen) {
      if (editingGoal) {
        setGoalTitle(editingGoal.title);
        setGoalDescription(editingGoal.description || '');
        setGoalCategory(editingGoal.category_id || '');
        setGoalType(editingGoal.type);
        setGoalDueDate(editingGoal.due_date ? parseISO(editingGoal.due_date) : undefined);
        setGoalParentId(editingGoal.parent_goal_id || null);
      } else {
        setGoalTitle('');
        setGoalDescription('');
        setGoalCategory(categories[0]?.id || '');
        setGoalType('daily');
        setGoalDueDate(undefined);
        setGoalParentId(null); // Reset parent ID for new top-level goals
      }
    }
  }, [isGoalFormOpen, editingGoal, categories]);

  const handleOpenGoalForm = (goal: Goal | null) => {
    setEditingGoal(goal);
    setIsGoalFormOpen(true);
  };

  const handleAddSubGoal = (parentGoalId: string) => {
    const parentGoal = goals.find(g => g.id === parentGoalId);
    if (parentGoal) {
      setEditingGoal(null); // Ensure it's a new goal
      setGoalTitle('');
      setGoalDescription('');
      setGoalCategory(parentGoal.category_id || categories[0]?.id || '');
      setGoalType(parentGoal.type); // Sub-goal inherits parent's type
      setGoalDueDate(parentGoal.due_date ? parseISO(parentGoal.due_date) : undefined);
      setGoalParentId(parentGoalId);
      setIsGoalFormOpen(true);
    }
  };

  const handleSuggestGoal = async () => {
    if (isDemo) return; // Disable AI in demo mode
    if (!goalTitle.trim()) {
      showError('Please enter a goal title to get suggestions.');
      return;
    }
    setIsSuggestingGoal(true);
    const loadingToastId = showLoading('Getting AI suggestions...');
    try {
      const categoriesForAI = categories.map(cat => ({ id: cat.id, name: cat.name }));
      const suggestions = await suggestGoalDetails(goalTitle, categoriesForAI, new Date());

      if (suggestions) {
        setGoalTitle(suggestions.cleanedDescription);
        setGoalDescription(suggestions.notes || '');
        
        let finalCategoryId = '';
        const suggestedCategory = categories.find(cat => cat.name.toLowerCase() === suggestions.category.toLowerCase());
        if (suggestedCategory) {
          finalCategoryId = suggestedCategory.id;
        } else {
          // Category does not exist, create it
          const newCat = await addCategory({ name: suggestions.category, color: '#6b7280' }); // Default color
          if (newCat) {
            finalCategoryId = newCat.id;
          } else {
            showError('Failed to create new category. Using default.');
            finalCategoryId = categories[0]?.id || '';
          }
        }
        setGoalCategory(finalCategoryId);

        if (suggestions.dueDate) {
          setGoalDueDate(parseISO(suggestions.dueDate));
        }
        // Priority and section are not directly applicable to goals in the same way as tasks,
        // so we'll ignore them for now or map them if a similar concept exists for goals.
      }
    } catch (error) {
      console.error('Error getting AI suggestions for goal:', error);
      showError('Failed to get AI suggestions. Please try again.');
    } finally {
      dismissToast(loadingToastId);
      setIsSuggestingGoal(false);
    }
  };

  const handleSaveGoal = async (goalDataFromQuickAdd?: QuickAddGoalData) => {
    setIsSavingGoal(true);

    let dataToSave: NewGoalData;

    if (goalDataFromQuickAdd) {
      // Data coming from QuickAddGoal, add default completed and order
      dataToSave = {
        ...goalDataFromQuickAdd,
        completed: false, // Default for new goals
        order: null,      // Default for new goals
      };
    } else {
      // Data coming from the main form, use existing state
      dataToSave = {
        title: goalTitle.trim(),
        description: goalDescription.trim() || null,
        category_id: goalCategory,
        type: goalType,
        due_date: goalDueDate ? format(goalDueDate, 'yyyy-MM-dd') : null,
        completed: editingGoal?.completed || false, // Retain existing completed status for edits
        order: editingGoal?.order || null, // Retain existing order for edits
        parent_goal_id: goalParentId,
      };
    }

    if (editingGoal) {
      await updateGoal({ id: editingGoal.id, updates: dataToSave });
    } else {
      await addGoal(dataToSave);
    }
    setIsSavingGoal(false);
    setIsGoalFormOpen(false);
  };

  const handleToggleGoalComplete = async (goalId: string, completed: boolean) => {
    if (isDemo) return;
    await updateGoal({ id: goalId, updates: { completed } });
  };

  const handleDeleteGoalClick = (goalId: string) => {
    setGoalToDeleteId(goalId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteGoal = async () => {
    if (goalToDeleteId) {
      setIsSavingGoal(true);
      await deleteGoal(goalToDeleteId);
      setIsSavingGoal(false);
      setIsDeleteConfirmOpen(false);
      setGoalToDeleteId(null);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsSavingCategory(true);
    await addCategory({ name: newCategoryName.trim(), color: newCategoryColor });
    setNewCategoryName('');
    setNewCategoryColor('#3b82f6');
    setIsSavingCategory(false);
  };

  const handleDeleteCategoryClick = (categoryId: string, categoryName: string) => {
    setCategoryToDeleteId(categoryId);
    setCategoryToDeleteName(categoryName);
    setIsCategoryDeleteConfirmOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (categoryToDeleteId) {
      setIsSavingCategory(true);
      await deleteCategory(categoryToDeleteId);
      setIsSavingCategory(false);
      setIsCategoryDeleteConfirmOpen(false);
      setCategoryToDeleteId(null);
      setCategoryToDeleteName(null);
    }
  };

  const groupedGoals = useMemo(() => {
    const groups: Record<GoalType, Goal[]> = {
      'daily': [], 'weekly': [], 'monthly': [], '3-month': [], '6-month': [], '9-month': [], 'yearly': [], '3-year': [], '5-year': [], '7-year': [], '10-year': []
    };
    goals.forEach((goal: Goal) => {
      groups[goal.type]?.push(goal);
    });
    return groups;
  }, [goals]);

  const toggleExpandGoal = (goalId: string) => {
    setExpandedGoals(prev => {
      const newState = { ...prev, [goalId]: !(prev[goalId] ?? true) };
      localStorage.setItem('resonanceGoals_expandedGoals', JSON.stringify(newState));
      return newState;
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-xl p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <Sparkles className="h-7 w-7 text-primary" /> Resonance Goals
            </CardTitle>
            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4 mt-4">
              <Button onClick={() => setIsManageCategoriesOpen(true)} disabled={isDemo} variant="outline" className="w-full sm:w-auto h-9">
                <LayoutGrid className="mr-2 h-4 w-4" /> Manage Categories
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {goalTypes.map(type => {
                  const goalsOfType = groupedGoals[type.value];
                  // Only render a section if there are goals or if it's a top-level type
                  if (goalsOfType && goalsOfType.length > 0 || ['daily', 'weekly', 'monthly', '3-month', '6-month', '9-month', 'yearly', '3-year', '5-year', '7-year', '10-year'].includes(type.value)) {
                    return (
                      <ResonanceGoalTimelineSection
                        key={type.value}
                        goalType={type.value}
                        goals={goalsOfType || []}
                        allCategories={categories}
                        onAddGoal={handleSaveGoal}
                        onEditGoal={handleOpenGoalForm}
                        onDeleteGoal={handleDeleteGoalClick}
                        onToggleCompleteGoal={handleToggleGoalComplete}
                        onAddSubGoal={handleAddSubGoal}
                        isDemo={isDemo}
                        loading={loading}
                        expandedGoals={expandedGoals}
                        toggleExpandGoal={toggleExpandGoal}
                        onAddCategory={async (name, color) => {
                          try {
                            const newCategory = await addCategory({ name, color });
                            return newCategory;
                          } catch (error) {
                            console.error("Error adding category from timeline section:", error);
                            return null;
                          }
                        }}
                      />
                    );
                  }
                  return null;
                })}
                {goals.length === 0 && (
                  <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
                    <Sparkles className="h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">No goals set yet!</p>
                    <p className="text-sm">Start by adding your first goal to bring your vision to life.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="p-4">
        <p>&copy; {new Date().getFullYear()} TaskMaster. All rights reserved.</p>
      </footer>

      <FloatingAddGoalButton onClick={() => handleOpenGoalForm(null)} isDemo={isDemo} />

      {/* Goal Add/Edit Form Dialog */}
      <Dialog open={isGoalFormOpen} onOpenChange={setIsGoalFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Edit Goal' : (goalParentId ? 'Add Sub-goal' : 'Add New Goal')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="goal-title">Title</Label>
              <div className="flex gap-1.5">
                <Input
                  id="goal-title"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g., Learn a new song"
                  autoFocus
                  disabled={isSavingGoal || isDemo || isSuggestingGoal}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleSuggestGoal}
                  disabled={isSavingGoal || isDemo || isSuggestingGoal || !goalTitle.trim()}
                  title="Suggest details from title"
                  aria-label="Suggest goal details"
                  className="h-9 w-9"
                >
                  {isSuggestingGoal ? (
                    <span className="animate-spin h-3.5 w-3.5 border-b-2 border-primary rounded-full" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="goal-description">Description (Optional)</Label>
              <Textarea
                id="goal-description"
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                placeholder="Details about this goal..."
                rows={3}
                disabled={isSavingGoal || isDemo || isSuggestingGoal}
              />
            </div>
            <div>
              <Label htmlFor="goal-category">Category</Label>
              <Select value={goalCategory} onValueChange={setGoalCategory} disabled={isSavingGoal || isDemo || isSuggestingGoal}>
                <SelectTrigger id="goal-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="goal-type">Goal Type</Label>
              <Select value={goalType} onValueChange={(value) => setGoalType(value as GoalType)} disabled={isSavingGoal || isDemo || !!goalParentId || isSuggestingGoal}> {/* Disable if it's a sub-goal */}
                <SelectTrigger id="goal-type">
                  <SelectValue placeholder="Select goal type" />
                </SelectTrigger>
                <SelectContent>
                  {goalTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="goal-due-date">Due Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !goalDueDate && "text-muted-foreground"
                    )}
                    disabled={isSavingGoal || isDemo || isSuggestingGoal}
                  >
                    <CalendarComponent className="mr-2 h-4 w-4" />
                    {goalDueDate ? format(goalDueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={goalDueDate}
                    onSelect={setGoalDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGoalFormOpen(false)} disabled={isSavingGoal || isDemo || isSuggestingGoal}>Cancel</Button>
            <Button onClick={() => handleSaveGoal()} disabled={isSavingGoal || isDemo || isSuggestingGoal || !goalTitle.trim()}>
              {isSavingGoal ? 'Saving...' : 'Save Goal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goal Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this goal and any sub-goals associated with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSavingGoal || isDemo}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGoal} disabled={isSavingGoal || isDemo}>
              {isSavingGoal ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Categories Dialog */}
      <Dialog open={isManageCategoriesOpen} onOpenChange={setIsManageCategoriesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <h4 className="text-md font-semibold">Existing Categories</h4>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories yet.</p>
            ) : (
              <ul className="space-y-2">
                {categories.map(cat => (
                  <li key={cat.id} className="flex items-center justify-between p-2 rounded-md bg-background shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span>{cat.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDeleteCategoryClick(cat.id, cat.name)}
                      disabled={isSavingCategory || isDemo}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-md font-semibold mb-3">Create New Category</h4>
              <div>
                <Label htmlFor="new-category-name">Category Name</Label>
                <Input
                  id="new-category-name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Personal, Music"
                  disabled={isSavingCategory || isDemo}
                />
              </div>
              <div className="mt-4">
                <Label htmlFor="new-category-color">Color</Label>
                <Input
                  id="new-category-color"
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  disabled={isSavingCategory || isDemo}
                  className="w-full h-10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageCategoriesOpen(false)} disabled={isSavingCategory || isDemo}>Close</Button>
            <Button onClick={handleAddCategory} disabled={isSavingCategory || isDemo || !newCategoryName.trim()}>
              {isSavingCategory ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Delete Confirmation Dialog */}
      <AlertDialog open={isCategoryDeleteConfirmOpen} onOpenChange={setIsCategoryDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category "{categoryToDeleteName}" and remove it from all associated goals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSavingCategory || isDemo}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory} disabled={isSavingCategory || isDemo}>
              {isSavingCategory ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ResonanceGoalsPage;