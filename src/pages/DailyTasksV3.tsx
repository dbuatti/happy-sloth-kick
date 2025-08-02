import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import DateNavigator from '@/components/DateNavigator';
import TaskList from '@/components/TaskList';
import { MadeWithDyad } from '@/components/made-with-dyad';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { addDays, format, isBefore, isSameDay, parseISO, isValid, setHours, setMinutes } from 'date-fns';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import CommandPalette from '@/components/CommandPalette';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, ListTodo, CheckCircle2, Clock, Brain, Sparkles, Lightbulb, BellRing, Link as LinkIcon, Calendar as CalendarIconLucide, ChevronDown } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import { cn } from '@/lib/utils';
import BulkActions from '@/components/BulkActions';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useIsMobile } from '@/hooks/use-mobile';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import { Badge } from '@/components/ui/badge';
import TaskFilter from '@/components/TaskFilter';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import CategorySelector from '@/components/CategorySelector';
import PrioritySelector from '@/components/PrioritySelector';
import SectionSelector from '@/components/SectionSelector';
import { suggestTaskDetails } from '@/integrations/supabase/functions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import MoodBoosterButton from '@/components/MoodBoosterButton'; // Import MoodBoosterButton


const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

interface SuggestedTask {
  description: string;
  category: string; // Category ID
  priority: string;
  dueDate: Date | null;
  remindAtDate: Date | null;
  remindAtTime: string; // HH:MM string
  sectionId: string | null; // Section ID
  link: string | null;
}

const DailyTasksV3: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(() => getUTCStartOfDay(new Date()));
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Call useTasks first
  const {
    tasks,
    filteredTasks,
    nextAvailableTask,
    updateTask,
    deleteTask,
    userId,
    loading: tasksLoading,
    sections,
    allCategories,
    handleAddTask,
    selectedTaskIds,
    toggleTaskSelection,
    clearSelectedTasks,
    bulkUpdateTasks,
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    reorderSections,
    moveTask,
    updateTaskParentAndOrder,
    searchFilter,
    setSearchFilter,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    sectionFilter,
    setSectionFilter,
  } = useTasks({ currentDate, setCurrentDate, viewMode: 'daily' });

  // Then call useDailyTaskCount
  const { dailyTaskCount } = useDailyTaskCount();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [quickAddTaskDescription, setQuickAddTaskDescription] = useState('');
  const quickAddInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);

  // AI Parser states
  const [isAIParserOpen, setIsAIParserOpen] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [suggestedTask, setSuggestedTask] = useState<SuggestedTask | null>(null);
  const [isParsingAI, setIsParsingAI] = useState(false);
  const [isAddingAITask, setIsAddingAITask] = useState(false);

  // Temp states for suggested task editing
  const [tempDescription, setTempDescription] = useState('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempPriority, setTempPriority] = useState('medium');
  const [tempDueDate, setTempDueDate] = useState<Date | null>(null);
  const [tempRemindAtDate, setTempRemindAtDate] = useState<Date | null>(null);
  const [tempRemindAtTime, setTempRemindAtTime] = useState('');
  const [tempSectionId, setTempSectionId] = useState<string | null>(null);
  const [tempLink, setTempLink] = useState<string | null>(null);

  // Initialize temp states when suggestedTask changes
  useEffect(() => {
    if (suggestedTask) {
      setTempDescription(suggestedTask.description);
      setTempCategory(suggestedTask.category);
      setTempPriority(suggestedTask.priority);
      setTempDueDate(suggestedTask.dueDate);
      setTempRemindAtDate(suggestedTask.remindAtDate);
      setTempRemindAtTime(suggestedTask.remindAtTime);
      setTempSectionId(suggestedTask.sectionId);
      setTempLink(suggestedTask.link);
    } else {
      // Reset to defaults if no suggestion
      setTempDescription('');
      setTempCategory(allCategories.find(cat => cat.name.toLowerCase() === 'general')?.id || allCategories[0]?.id || '');
      setTempPriority('medium');
      setTempDueDate(null);
      setTempRemindAtDate(null);
      setTempRemindAtTime('');
      setTempSectionId(null);
      setTempLink(null);
    }
  }, [suggestedTask, allCategories]);

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => getUTCStartOfDay(addDays(prevDate, -1)));
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => getUTCStartOfDay(addDays(prevDate, 1)));
  };

  const handleGoToToday = () => {
    setCurrentDate(getUTCStartOfDay(new Date()));
  };

  const handleOpenOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleOpenDetail = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setIsTaskOverviewOpen(false);
    handleOpenDetail(task);
  };

  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTaskDescription.trim()) {
      showError('Task description cannot be empty.');
      return;
    }
    const success = await handleAddTask({
      description: quickAddTaskDescription.trim(),
      category: allCategories.find(cat => cat.name.toLowerCase() === 'general')?.id || allCategories[0]?.id || '',
      priority: 'medium',
      section_id: null,
      recurring_type: 'none',
      due_date: null,
      notes: null,
      remind_at: null,
      parent_task_id: null,
      link: null,
    });
    if (success) {
      setQuickAddTaskDescription('');
      quickAddInputRef.current?.focus();
    }
  };

  // AI Parser functions
  const handleParseText = useCallback(async () => {
    if (!aiInputText.trim()) {
      showError('Please enter text to parse.');
      return;
    }
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    setIsParsingAI(true);
    setSuggestedTask(null); // Clear previous suggestion

    try {
      const suggestions = await suggestTaskDetails(aiInputText.trim(), allCategories, currentDate);

      if (suggestions) {
        const parsedDueDate = suggestions.dueDate ? parseISO(suggestions.dueDate) : null;
        let parsedRemindAtDate: Date | null = null;
        let parsedRemindAtTime: string = '';

        if (suggestions.remindAt) {
          const parsedRemindAt = parseISO(suggestions.remindAt);
          if (isValid(parsedRemindAt)) {
            parsedRemindAtDate = parsedRemindAt;
            parsedRemindAtTime = format(parsedRemindAt, 'HH:mm');
          }
        }

        const matchedCategory = allCategories.find(cat => cat.id === suggestions.category || cat.name.toLowerCase() === suggestions.category.toLowerCase());
        const finalCategory = matchedCategory ? matchedCategory.id : (allCategories.find(cat => cat.name.toLowerCase() === 'general')?.id || allCategories[0]?.id || '');

        const matchedSection = sections.find(sec => sec.id === suggestions.section || sec.name.toLowerCase() === suggestions.section?.toLowerCase());
        const finalSectionId = matchedSection ? matchedSection.id : null;

        setSuggestedTask({
          description: suggestions.cleanedDescription,
          category: finalCategory,
          priority: suggestions.priority,
          dueDate: parsedDueDate,
          remindAtDate: parsedRemindAtDate,
          remindAtTime: parsedRemindAtTime,
          sectionId: finalSectionId,
          link: suggestions.link,
        });
      } else {
        showError('Could not generate suggestions. Please try rephrasing.');
      }
    } catch (error) {
      console.error('Error parsing text:', error);
      showError('Failed to parse text. Please try again.');
    } finally {
      setIsParsingAI(false);
    }
  }, [aiInputText, userId, allCategories, sections, currentDate]);

  const handleAddTaskFromSuggestion = useCallback(async () => {
    if (!suggestedTask || !userId || !tempDescription.trim() || !tempCategory.trim()) {
      showError('Please ensure all required task details are present.');
      return;
    }

    setIsAddingAITask(true);

    let finalRemindAt: string | null = null;
    if (tempRemindAtDate && tempRemindAtTime && tempRemindAtTime.trim() !== "") {
      const [hours, minutes] = tempRemindAtTime.split(':').map(Number);
      const combinedDateTime = setMinutes(setHours(tempRemindAtDate, hours), minutes);
      if (isValid(combinedDateTime)) {
        finalRemindAt = combinedDateTime.toISOString();
      }
    }

    const success = await handleAddTask({
      description: tempDescription.trim(),
      category: tempCategory,
      priority: tempPriority,
      due_date: tempDueDate ? tempDueDate.toISOString() : null,
      notes: null,
      remind_at: finalRemindAt,
      section_id: tempSectionId,
      recurring_type: 'none',
      parent_task_id: null,
      link: tempLink,
    });

    if (success) {
      setSuggestedTask(null);
      setAiInputText('');
      setIsAIParserOpen(false); // Close the AI parser section
      showSuccess('Task added successfully!');
    }
    setIsAddingAITask(false);
  }, [suggestedTask, userId, tempDescription, tempCategory, tempPriority, tempDueDate, tempRemindAtDate, tempRemindAtTime, tempSectionId, tempLink, handleAddTask]);

  const isAddButtonDisabled = !tempDescription.trim() || !tempCategory.trim() || isAddingAITask || tasksLoading;

  // Keyboard shortcuts (+ "/" quick focus for quick-add)
  const shortcuts: ShortcutMap = {
    'arrowleft': () => handlePreviousDay(),
    'arrowright': () => handleNextDay(),
    't': () => handleGoToToday(),
    '/': (e) => { e.preventDefault(); searchInputRef.current?.focus(); },
    'cmd+k': (e) => { e.preventDefault(); setIsCommandPaletteOpen(prev => !prev); },
  };
  useKeyboardShortcuts(shortcuts);

  const { totalCount, completedCount, overdueCount } = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.status === 'completed').length;
    const overdue = filteredTasks.filter(t => {
      if (!t.due_date) return false;
      const due = parseISO(t.due_date);
      const isOver = isBefore(due, currentDate) && !isSameDay(due, currentDate) && t.status !== 'completed';
      return isOver;
    }).length;
    return { totalCount: total, completedCount: completed, overdueCount: overdue };
  }, [filteredTasks, currentDate]);

  // Sticky shadow cue on scroll logic
  const [stuck, setStuck] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        setStuck(scrollRef.current.scrollTop > 0);
      }
    };

    const currentScrollRef = scrollRef.current;
    if (currentScrollRef) {
      currentScrollRef.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (currentScrollRef) {
        currentScrollRef.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const isBulkActionsActive = selectedTaskIds.length > 0;

  return (
    <div className="flex-1 flex flex-col">
      <main className={cn("flex-grow p-4", isBulkActionsActive ? "pb-[90px]" : "")}>
        <div className="w-full max-w-4xl mx-auto h-full">
          <Card className="shadow-lg p-4 h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold">Your Tasks</CardTitle>
                <div className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">{dailyTaskCount}</span>
                  <MoodBoosterButton /> {/* Added MoodBoosterButton here */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsFocusPanelOpen(true)}
                    aria-label="Open focus tools"
                    className="ml-2 h-9 w-9"
                  >
                    <Brain className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-center gap-3 mt-2">
                <Badge variant="outline" className="px-3 py-1 text-sm font-medium bg-primary/10 text-primary">
                  <ListTodo className="h-3.5 w-3.5 mr-1.5" /> {totalCount} Total
                </Badge>
                <Badge variant="outline" className="px-3 py-1 text-sm font-medium bg-green-500/10 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> {completedCount} Completed
                </Badge>
                <Badge variant="outline" className="px-3 py-1 text-sm font-medium bg-destructive/10 text-destructive">
                  <Clock className="h-3.5 w-3.5 mr-1.5" /> {overdueCount} Overdue
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-3 flex-1 flex flex-col">
              <div className="mb-3">
                <DateNavigator
                  currentDate={currentDate}
                  onPreviousDay={handlePreviousDay}
                  onNextDay={handleNextDay}
                  onGoToToday={handleGoToToday}
                  setCurrentDate={setCurrentDate}
                />
              </div>

              {/* AI Task Parser Section */}
              <Collapsible open={isAIParserOpen} onOpenChange={setIsAIParserOpen} className="mb-4">
                <CollapsibleTrigger asChild>
                  <Button variant="default" className="w-full justify-between h-9">
                    <span className="flex items-center gap-2 text-base font-semibold">
                      <Sparkles className="h-5 w-5 text-primary-foreground" /> AI Task Parser
                    </span>
                    <ChevronDown className={cn("h-5 w-5 transition-transform text-primary-foreground", isAIParserOpen ? "rotate-0" : "-rotate-90")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-input-text">Paste your text here:</Label>
                    <Textarea
                      id="ai-input-text"
                      placeholder="e.g., 'Daniele! I am trying to book for Kinesiology through the link but having trouble with the last page not submitting. Do you still have next Tuesday @ 11am available for a 9 minute session, if so could i please book! Thought this might help speed up our email tag'"
                      value={aiInputText}
                      onChange={(e) => setAiInputText(e.target.value)}
                      rows={4}
                      disabled={isParsingAI}
                      className="min-h-[100px]"
                    />
                    <Button onClick={handleParseText} className="w-full h-9" disabled={isParsingAI || !aiInputText.trim()}>
                      {isParsingAI ? 'Parsing...' : <><Lightbulb className="mr-2 h-4 w-4" /> Parse Text</>}
                    </Button>
                  </div>

                  {isParsingAI && (
                    <div className="flex justify-center items-center py-4">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                  )}

                  {suggestedTask && (
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" /> Suggested Task Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="suggested-description">Description</Label>
                          <Input
                            id="suggested-description"
                            value={tempDescription}
                            onChange={(e) => setTempDescription(e.target.value)}
                            disabled={isAddingAITask}
                            className="h-9"
                          />
                        </div>
                        <CategorySelector
                          value={tempCategory}
                          onChange={setTempCategory}
                          userId={userId}
                          categories={allCategories}
                        />
                        <PrioritySelector
                          value={tempPriority}
                          onChange={setTempPriority}
                        />
                        <SectionSelector
                          value={tempSectionId}
                          onChange={setTempSectionId}
                          userId={userId}
                          sections={sections}
                        />
                        <div className="space-y-2">
                          <Label>Due Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-9",
                                  !tempDueDate && "text-muted-foreground"
                                )}
                                disabled={isAddingAITask}
                              >
                                <CalendarIconLucide className="mr-2 h-3.5 w-3.5" />
                                {tempDueDate ? format(tempDueDate, "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={tempDueDate || undefined}
                                onSelect={setTempDueDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>Reminder</Label>
                          <div className="flex gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "flex-1 justify-start text-left font-normal h-9",
                                    !tempRemindAtDate && "text-muted-foreground"
                                  )}
                                  disabled={isAddingAITask}
                                >
                                  <BellRing className="mr-2 h-3.5 w-3.5" />
                                  {tempRemindAtDate ? format(tempRemindAtDate, "PPP") : <span>Set reminder date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={tempRemindAtDate || undefined}
                                  onSelect={setTempRemindAtDate}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <Input
                              type="time"
                              value={tempRemindAtTime}
                              onChange={(e) => setTempRemindAtTime(e.target.value)}
                              className="w-24 h-9"
                              disabled={isAddingAITask || !tempRemindAtDate}
                            />
                          </div>
                        </div>
                        <div className="space-y-2 col-span-full">
                          <Label htmlFor="suggested-link">Link (Optional)</Label>
                          <Input
                            id="suggested-link"
                            type="url"
                            value={tempLink || ''}
                            onChange={(e) => setTempLink(e.target.value)}
                            placeholder="e.g., https://example.com/task-details"
                            disabled={isAddingAITask}
                            className="h-9"
                          />
                        </div>
                      </div>
                      <Button onClick={handleAddTaskFromSuggestion} className="w-full h-9" disabled={isAddButtonDisabled}>
                        {isAddingAITask ? 'Adding Task...' : <><Plus className="mr-2 h-4 w-4" /> Add Task to List</>}
                      </Button>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Task Filter and Search */}
              <TaskFilter
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                searchFilter={searchFilter}
                setSearchFilter={setSearchFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                priorityFilter={priorityFilter}
                setPriorityFilter={setPriorityFilter}
                sectionFilter={sectionFilter}
                setSectionFilter={setSectionFilter}
                sections={sections}
                allCategories={allCategories}
                searchRef={searchInputRef}
              />

              {/* Quick Add Task Bar */}
              <div
                className={cn(
                  "sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border -mx-4 px-4 py-3 transition-shadow",
                  stuck ? "shadow-lg" : ""
                )}
              >
                <form onSubmit={handleQuickAddTask}>
                  <div className="flex items-center gap-2">
                    <Input
                      ref={quickAddInputRef}
                      placeholder='Quick add a task — press "/" to focus, Enter to add'
                      value={quickAddTaskDescription}
                      onChange={(e) => setQuickAddTaskDescription(e.target.value)}
                      className="flex-1 h-9 text-sm"
                    />
                    <Button type="submit" className="whitespace-nowrap h-9 text-sm">
                      <Plus className="mr-1 h-3 w-3" /> Add
                    </Button>
                  </div>
                </form>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto pt-3 -mx-4 px-4">
                <TaskList
                  tasks={tasks}
                  filteredTasks={filteredTasks}
                  loading={tasksLoading}
                  userId={userId}
                  handleAddTask={handleAddTask}
                  updateTask={updateTask}
                  deleteTask={deleteTask}
                  selectedTaskIds={selectedTaskIds}
                  toggleTaskSelection={toggleTaskSelection}
                  clearSelectedTasks={clearSelectedTasks}
                  bulkUpdateTasks={bulkUpdateTasks}
                  markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
                  sections={sections}
                  createSection={createSection}
                  updateSection={updateSection}
                  deleteSection={deleteSection}
                  updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                  updateTaskParentAndOrder={updateTaskParentAndOrder}
                  reorderSections={reorderSections}
                  moveTask={moveTask}
                  allCategories={allCategories}
                  setIsAddTaskOpen={() => {}}
                  onOpenOverview={handleOpenOverview}
                  currentDate={currentDate}
                  setCurrentDate={setCurrentDate}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="p-4">
        <MadeWithDyad />
      </footer>

      <BulkActions
        selectedTaskIds={selectedTaskIds}
        onAction={async (action) => {
          if (action.startsWith('priority-')) {
            await bulkUpdateTasks({ priority: action.replace('priority-', '') as Task['priority'] });
          } else if (action === 'complete') {
            await bulkUpdateTasks({ status: 'completed' });
          } else if (action === 'archive') {
            await bulkUpdateTasks({ status: 'archived' });
          } else if (action === 'delete') {
            await Promise.all(selectedTaskIds.map(id => deleteTask(id)));
            clearSelectedTasks();
          }
        }}
        onClearSelection={clearSelectedTasks}
      />

      <CommandPalette
        isCommandPaletteOpen={isCommandPaletteOpen}
        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
      />

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          userId={userId}
          isOpen={isTaskOverviewOpen}
          onClose={() => {
            setIsTaskOverviewOpen(false);
            setTaskToOverview(null);
          }}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={tasks}
        />
      )}

      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          userId={userId}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
        />
      )}

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        tasks={tasks}
        filteredTasks={filteredTasks}
        updateTask={updateTask}
        onOpenDetail={handleOpenDetail}
        onDeleteTask={deleteTask}
        sections={sections}
        allCategories={allCategories}
        userId={userId}
        currentDate={currentDate}
      />
    </div>
  );
};

export default DailyTasksV3;