import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, BellRing, Lightbulb, Plus, Sparkles, Link as LinkIcon } from 'lucide-react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useTasks, TaskSection, Category } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { suggestTaskDetails } from '@/integrations/supabase/functions';
import { showError, showSuccess } from '@/utils/toast';
import { format, parseISO, isValid, setHours, setMinutes } from 'date-fns';
import CategorySelector from '@/components/CategorySelector';
import PrioritySelector from '@/components/PrioritySelector';
import SectionSelector from '@/components/SectionSelector';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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

const AITextParser: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const { sections, allCategories, handleAddTask, loading: tasksLoading } = useTasks();

  const [inputText, setInputText] = useState('');
  const [suggestedTask, setSuggestedTask] = useState<SuggestedTask | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const [tempDescription, setTempDescription] = useState('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempPriority, setTempPriority] = useState('medium');
  const [tempDueDate, setTempDueDate] = useState<Date | null>(null);
  const [tempRemindAtDate, setTempRemindAtDate] = useState<Date | null>(null);
  const [tempRemindAtTime, setTempRemindAtTime] = useState('');
  const [tempSectionId, setTempSectionId] = useState<string | null>(null);
  const [tempLink, setTempLink] = useState<string | null>(null);

  // Initialize temp states when suggestedTask changes
  React.useEffect(() => {
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

  const handleParseText = useCallback(async () => {
    if (!inputText.trim()) {
      showError('Please enter text to parse.');
      return;
    }
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    setIsParsing(true);
    setSuggestedTask(null); // Clear previous suggestion

    try {
      const suggestions = await suggestTaskDetails(inputText.trim(), allCategories, new Date());

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

        // Map suggested category name to ID
        const matchedCategory = allCategories.find(cat => cat.id === suggestions.category || cat.name.toLowerCase() === suggestions.category.toLowerCase());
        const finalCategory = matchedCategory ? matchedCategory.id : (allCategories.find(cat => cat.name.toLowerCase() === 'general')?.id || allCategories[0]?.id || '');

        // Map suggested section name to ID
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
      setIsParsing(false);
    }
  }, [inputText, userId, allCategories, sections]);

  const handleAddTaskFromSuggestion = useCallback(async () => {
    if (!suggestedTask || !userId || !tempDescription.trim() || !tempCategory.trim()) {
      showError('Please ensure all required task details are present.');
      return;
    }

    setIsAddingTask(true);

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
      notes: null, // AI doesn't suggest notes currently
      remind_at: finalRemindAt,
      section_id: tempSectionId,
      recurring_type: 'none', // AI doesn't suggest recurring type currently
      parent_task_id: null,
      link: tempLink,
    });

    if (success) {
      setSuggestedTask(null);
      setInputText('');
      showSuccess('Task added successfully!');
    }
    setIsAddingTask(false);
  }, [suggestedTask, userId, tempDescription, tempCategory, tempPriority, tempDueDate, tempRemindAtDate, tempRemindAtTime, tempSectionId, tempLink, handleAddTask]);

  const isAddButtonDisabled = !tempDescription.trim() || !tempCategory.trim() || isAddingTask || tasksLoading;

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-4xl mx-auto shadow-lg p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <Sparkles className="h-7 w-7 text-primary" /> AI Task Parser
            </CardTitle>
            <p className="text-muted-foreground text-center">
              Paste any text, and AI will suggest a task for you.
            </p>
          </CardHeader>
          <CardContent className="pt-0 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="input-text">Paste your text here:</Label>
              <Textarea
                id="input-text"
                placeholder="e.g., 'Daniele! I am trying to book for Kinesiology through the link but having trouble with the last page not submitting. Do you still have next Tuesday @ 11am available for a 9 minute session, if so could i please book! Thought this might help speed up our email tag'"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={6}
                disabled={isParsing}
                className="min-h-[120px]"
              />
              <Button onClick={handleParseText} className="w-full h-9" disabled={isParsing || !inputText.trim()}>
                {isParsing ? 'Parsing...' : <><Lightbulb className="mr-2 h-4 w-4" /> Parse Text</>}
              </Button>
            </div>

            {isParsing && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            )}

            {suggestedTask && (
              <div className="space-y-4 border-t pt-4 mt-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Suggested Task Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="suggested-description">Description</Label>
                    <Input
                      id="suggested-description"
                      value={tempDescription}
                      onChange={(e) => setTempDescription(e.target.value)}
                      disabled={isAddingTask}
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
                          disabled={isAddingTask}
                        >
                          <Calendar className="mr-2 h-3.5 w-3.5" />
                          {tempDueDate ? format(tempDueDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
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
                            disabled={isAddingTask}
                          >
                            <BellRing className="mr-2 h-3.5 w-3.5" />
                            {tempRemindAtDate ? format(tempRemindAtDate, "PPP") : <span>Set reminder date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
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
                        disabled={isAddingTask || !tempRemindAtDate}
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
                      disabled={isAddingTask}
                      className="h-9"
                    />
                  </div>
                </div>
                <Button onClick={handleAddTaskFromSuggestion} className="w-full h-9" disabled={isAddButtonDisabled}>
                  {isAddingTask ? 'Adding Task...' : <><Plus className="mr-2 h-4 w-4" /> Add Task to List</>}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default AITextParser;