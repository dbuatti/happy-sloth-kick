import { supabase } from './client';
import { Task, TaskSection, TaskCategory, DoTodayOffLog, Appointment, Project, UserSettings, WorkHour, QuickLink, WeeklyFocus, GratitudeJournalEntry, WorryJournalEntry, SleepRecord, PeopleMemory, CustomDashboardCard, TaskPriority } from '@/types/task'; // Corrected import

// --- Task related API calls ---
export const fetchTasks = async (userId: string, viewMode: 'all' | 'focus' | 'archive' | 'today', currentDate: Date | null = null): Promise<Task[]> => {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      task_categories (
        color
      )
    `)
    .eq('user_id', userId);

  if (viewMode === 'archive') {
    query = query.eq('status', 'archived');
  } else {
    query = query.neq('status', 'archived');
  }

  if (viewMode === 'today' && currentDate) {
    const todayStart = currentDate.toISOString().split('T')[0];
    query = query.or(`due_date.eq.${todayStart},due_date.is.null`);
  }

  const { data, error } = await query.order('order', { ascending: true }).order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  return data.map((task: any) => ({
    ...task,
    category_color: task.task_categories?.color || null,
  }));
};

export const addTask = async (taskData: Partial<Task>): Promise<Task | null> => {
  const { data, error } = await supabase.from('tasks').insert(taskData).select().single();
  if (error) {
    console.error('Error adding task:', error);
    return null;
  }
  return data;
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task | null> => {
  const { data, error } = await supabase.from('tasks').update(updates).eq('id', taskId).select().single();
  if (error) {
    console.error('Error updating task:', error);
    return null;
  }
  return data;
};

export const deleteTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

export const bulkUpdateTasks = async (taskIds: string[], updates: Partial<Task>): Promise<void> => {
  const { error } = await supabase.from('tasks').update(updates).in('id', taskIds);
  if (error) {
    console.error('Error bulk updating tasks:', error);
    throw error;
  }
};

export const reorderTasks = async (updates: { id: string; order: number | null; section_id: string | null; parent_task_id: string | null; }[]): Promise<void> => {
  const { error } = await supabase.rpc('update_tasks_order', { updates });
  if (error) {
    console.error('Error reordering tasks:', error);
    throw error;
  }
};

// --- Section related API calls ---
export const fetchSections = async (userId: string): Promise<TaskSection[]> => {
  const { data, error } = await supabase
    .from('task_sections')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });
  if (error) {
    console.error('Error fetching sections:', error);
    return [];
  }
  return data;
};

export const createSection = async (userId: string, name: string): Promise<TaskSection | null> => {
  const { data, error } = await supabase.from('task_sections').insert({ user_id: userId, name }).select().single();
  if (error) {
    console.error('Error creating section:', error);
    return null;
  }
  return data;
};

export const updateSection = async (sectionId: string, updates: Partial<TaskSection>): Promise<TaskSection | null> => {
  const { data, error } = await supabase.from('task_sections').update(updates).eq('id', sectionId).select().single();
  if (error) {
    console.error('Error updating section:', error);
    return null;
  }
  return data;
};

export const deleteSection = async (sectionId: string): Promise<void> => {
  const { error } = await supabase.from('task_sections').delete().eq('id', sectionId);
  if (error) {
    console.error('Error deleting section:', error);
    throw error;
  }
};

// --- Category related API calls ---
export const fetchCategories = async (userId: string): Promise<TaskCategory[]> => {
  const { data, error } = await supabase
    .from('task_categories')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data;
};

export const createCategory = async (userId: string, name: string, color: string): Promise<TaskCategory | null> => {
  const { data, error } = await supabase.from('task_categories').insert({ user_id: userId, name, color }).select().single();
  if (error) {
    console.error('Error creating category:', error);
    return null;
  }
  return data;
};

export const updateCategory = async (categoryId: string, updates: Partial<TaskCategory>): Promise<TaskCategory | null> => {
  const { data, error } = await supabase.from('task_categories').update(updates).eq('id', categoryId).select().single();
  if (error) {
    console.error('Error updating category:', error);
    return null;
  }
  return data;
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  const { error } = await supabase.from('task_categories').delete().eq('id', categoryId);
  if (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// --- Do Today Off Log API calls ---
export const fetchDoTodayOffLog = async (userId: string, date: Date): Promise<DoTodayOffLog[]> => {
  const { data, error } = await supabase
    .from('do_today_off_log')
    .select('*')
    .eq('user_id', userId)
    .eq('off_date', date.toISOString().split('T')[0]);
  if (error) {
    console.error('Error fetching do today off log:', error);
    return [];
  }
  return data;
};

export const addDoTodayOffLog = async (userId: string, taskId: string, date: Date): Promise<void> => {
  const { error } = await supabase.from('do_today_off_log').insert({ user_id: userId, task_id: taskId, off_date: date.toISOString().split('T')[0] });
  if (error) {
    console.error('Error adding do today off log:', error);
    throw error;
  }
};

export const deleteDoTodayOffLog = async (userId: string, taskId: string, date: Date): Promise<void> => {
  const { error } = await supabase.from('do_today_off_log').delete().eq('user_id', userId).eq('task_id', taskId).eq('off_date', date.toISOString().split('T')[0]);
  if (error) {
    console.error('Error deleting do today off log:', error);
    throw error;
  }
};

// --- Daily Briefing API calls ---
export const getDailyBriefing = async (userId: string) => {
  // This is a placeholder. Implement actual daily briefing logic here.
  // For example, fetch tasks, appointments, journal entries for the day.
  console.log(`Fetching daily briefing for user: ${userId}`);
  return {
    tasksDueToday: 5,
    appointmentsToday: 2,
    focusTasks: 1,
  };
};

// --- AI Suggestion API calls ---
export interface SuggestedTaskDetails {
  cleanedDescription: string;
  suggestedCategory: string | null;
  suggestedSection: string | null;
  suggestedPriority: TaskPriority;
  suggestedDueDate: string | null;
  suggestedNotes: string | null;
  suggestedRemindAt: string | null;
  suggestedLink: string | null;
}

export const suggestTaskDetails = async (
  taskDescription: string,
  categories: { id: string; name: string }[],
  currentDate: Date
): Promise<SuggestedTaskDetails> => {
  // This is a placeholder. Implement actual AI suggestion logic here.
  console.log(`Suggesting details for: ${taskDescription}`);
  console.log('Categories:', categories);
  console.log('Current Date:', currentDate);

  // Mocking AI suggestions
  const lowerDescription = taskDescription.toLowerCase();
  let suggestedCategory: string | null = null;
  let suggestedPriority: TaskPriority = 'medium';
  let suggestedDueDate: string | null = null;
  let suggestedNotes: string | null = null;
  let suggestedLink: string | null = null;

  if (lowerDescription.includes('work')) suggestedCategory = 'Work';
  if (lowerDescription.includes('personal')) suggestedCategory = 'Personal';
  if (lowerDescription.includes('urgent')) suggestedPriority = 'urgent';
  if (lowerDescription.includes('tomorrow')) suggestedDueDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  if (lowerDescription.includes('link:')) {
    const match = lowerDescription.match(/link:\s*(https?:\/\/\S+)/);
    if (match) suggestedLink = match[1];
  }

  return {
    cleanedDescription: taskDescription.replace(/link:\s*(https?:\/\/\S+)/, '').trim(),
    suggestedCategory: suggestedCategory,
    suggestedSection: null, // Placeholder
    suggestedPriority: suggestedPriority,
    suggestedDueDate: suggestedDueDate,
    suggestedNotes: suggestedNotes,
    suggestedRemindAt: null, // Placeholder
    suggestedLink: suggestedLink,
  };
};

// --- Appointment related API calls ---
export const addAppointment = async (appointmentData: Partial<Appointment>): Promise<Appointment | null> => {
  const { data, error } = await supabase.from('schedule_appointments').insert(appointmentData).select().single();
  if (error) {
    console.error('Error adding appointment:', error);
    return null;
  }
  return data;
};

export const updateAppointment = async (appointmentId: string, updates: Partial<Appointment>): Promise<Appointment | null> => {
  const { data, error } = await supabase.from('schedule_appointments').update(updates).eq('id', appointmentId).select().single();
  if (error) {
    console.error('Error updating appointment:', error);
    return null;
  }
  return data;
};

export const deleteAppointment = async (appointmentId: string): Promise<void> => {
  const { error } = await supabase.from('schedule_appointments').delete().eq('id', appointmentId);
  if (error) {
    console.error('Error deleting appointment:', error);
    throw error;
  }
};

// --- Project related API calls ---
export const fetchProjects = async (userId: string): Promise<Project[]> => {
  const { data, error } = await supabase.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
  return data;
};

export const addProject = async (projectData: Partial<Project>): Promise<Project | null> => {
  const { data, error } = await supabase.from('projects').insert(projectData).select().single();
  if (error) {
    console.error('Error adding project:', error);
    return null;
  }
  return data;
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project | null> => {
  const { data, error } = await supabase.from('projects').update(updates).eq('id', projectId).select().single();
  if (error) {
    console.error('Error updating project:', error);
    return null;
  }
  return data;
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

// --- User Settings API calls ---
export const fetchUserSettings = async (userId: string): Promise<UserSettings | null> => {
  const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error fetching user settings:', error);
    return null;
  }
  return data;
};

export const updateUserSettings = async (userId: string, updates: Partial<UserSettings>): Promise<UserSettings | null> => {
  const { data, error } = await supabase.from('user_settings').update(updates).eq('user_id', userId).select().single();
  if (error) {
    console.error('Error updating user settings:', error);
    return null;
  }
  return data;
};

// --- User Work Hours API calls ---
export const fetchUserWorkHours = async (userId: string): Promise<WorkHour[]> => {
  const { data, error } = await supabase.from('user_work_hours').select('*').eq('user_id', userId).order('day_of_week');
  if (error) {
    console.error('Error fetching user work hours:', error);
    return [];
  }
  return data;
};

export const saveUserWorkHours = async (userId: string, hours: WorkHour[]): Promise<void> => {
  const { error } = await supabase.from('user_work_hours').upsert(hours.map(h => ({ ...h, user_id: userId })));
  if (error) {
    console.error('Error saving user work hours:', error);
    throw error;
  }
};

// --- Quick Links API calls ---
export const fetchQuickLinks = async (userId: string): Promise<QuickLink[]> => {
  const { data, error } = await supabase.from('quick_links').select('*').eq('user_id', userId).order('link_order');
  if (error) {
    console.error('Error fetching quick links:', error);
    return [];
  }
  return data;
};

export const addQuickLink = async (linkData: Partial<QuickLink>): Promise<QuickLink | null> => {
  const { data, error } = await supabase.from('quick_links').insert(linkData).select().single();
  if (error) {
    console.error('Error adding quick link:', error);
    return null;
  }
  return data;
};

export const updateQuickLink = async (linkId: string, updates: Partial<QuickLink>): Promise<QuickLink | null> => {
  const { data, error } = await supabase.from('quick_links').update(updates).eq('id', linkId).select().single();
  if (error) {
    console.error('Error updating quick link:', error);
    return null;
  }
  return data;
};

export const deleteQuickLink = async (linkId: string): Promise<void> => {
  const { error } = await supabase.from('quick_links').delete().eq('id', linkId);
  if (error) {
    console.error('Error deleting quick link:', error);
    throw error;
  }
};

// --- Weekly Focus API calls ---
export const fetchWeeklyFocus = async (userId: string, weekStartDate: string): Promise<WeeklyFocus | null> => {
  const { data, error } = await supabase.from('weekly_focus').select('*').eq('user_id', userId).eq('week_start_date', weekStartDate).single();
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching weekly focus:', error);
    return null;
  }
  return data;
};

export const upsertWeeklyFocus = async (focusData: Partial<WeeklyFocus>): Promise<WeeklyFocus | null> => {
  const { data, error } = await supabase.from('weekly_focus').upsert(focusData).select().single();
  if (error) {
    console.error('Error upserting weekly focus:', error);
    return null;
  }
  return data;
};

// --- Gratitude Journal API calls ---
export const fetchGratitudeJournalEntries = async (userId: string): Promise<GratitudeJournalEntry[]> => {
  const { data, error } = await supabase.from('gratitude_journal_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching gratitude journal entries:', error);
    return [];
  }
  return data;
};

export const addGratitudeJournalEntry = async (entryData: Partial<GratitudeJournalEntry>): Promise<GratitudeJournalEntry | null> => {
  const { data, error } = await supabase.from('gratitude_journal_entries').insert(entryData).select().single();
  if (error) {
    console.error('Error adding gratitude journal entry:', error);
    return null;
  }
  return data;
};

export const deleteGratitudeJournalEntry = async (entryId: string): Promise<void> => {
  const { error } = await supabase.from('gratitude_journal_entries').delete().eq('id', entryId);
  if (error) {
    console.error('Error deleting gratitude journal entry:', error);
    throw error;
  }
};

// --- Worry Journal API calls ---
export const fetchWorryJournalEntries = async (userId: string): Promise<WorryJournalEntry[]> => {
  const { data, error } = await supabase.from('worry_journal_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching worry journal entries:', error);
    return [];
  }
  return data;
};

export const addWorryJournalEntry = async (entryData: Partial<WorryJournalEntry>): Promise<WorryJournalEntry | null> => {
  const { data, error } = await supabase.from('worry_journal_entries').insert(entryData).select().single();
  if (error) {
    console.error('Error adding worry journal entry:', error);
    return null;
  }
  return data;
};

export const deleteWorryJournalEntry = async (entryId: string): Promise<void> => {
  const { error } = await supabase.from('worry_journal_entries').delete().eq('id', entryId);
  if (error) {
    console.error('Error deleting worry journal entry:', error);
    throw error;
  }
};

// --- Sleep Records API calls ---
export const fetchSleepRecords = async (userId: string): Promise<SleepRecord[]> => {
  const { data, error } = await supabase.from('sleep_records').select('*').eq('user_id', userId).order('date', { ascending: false });
  if (error) {
    console.error('Error fetching sleep records:', error);
    return [];
  }
  return data;
};

export const addSleepRecord = async (recordData: Partial<SleepRecord>): Promise<SleepRecord | null> => {
  const { data, error } = await supabase.from('sleep_records').insert(recordData).select().single();
  if (error) {
    console.error('Error adding sleep record:', error);
    return null;
  }
  return data;
};

export const updateSleepRecord = async (recordId: string, updates: Partial<SleepRecord>): Promise<SleepRecord | null> => {
  const { data, error } = await supabase.from('sleep_records').update(updates).eq('id', recordId).select().single();
  if (error) {
    console.error('Error updating sleep record:', error);
    return null;
  }
  return data;
};

export const deleteSleepRecord = async (recordId: string): Promise<void> => {
  const { error } = await supabase.from('sleep_records').delete().eq('id', recordId);
  if (error) {
    console.error('Error deleting sleep record:', error);
    throw error;
  }
};

// --- People Memory API calls ---
export const fetchPeopleMemory = async (userId: string): Promise<PeopleMemory[]> => {
  const { data, error } = await supabase.from('people_memory').select('*').eq('user_id', userId).order('name');
  if (error) {
    console.error('Error fetching people memory:', error);
    return [];
  }
  return data;
};

export const addPeopleMemory = async (personData: Partial<PeopleMemory>): Promise<PeopleMemory | null> => {
  const { data, error } = await supabase.from('people_memory').insert(personData).select().single();
  if (error) {
    console.error('Error adding person to memory:', error);
    return null;
  }
  return data;
};

export const updatePeopleMemory = async (personId: string, updates: Partial<PeopleMemory>): Promise<PeopleMemory | null> => {
  const { data, error } = await supabase.from('people_memory').update(updates).eq('id', personId).select().single();
  if (error) {
    console.error('Error updating person in memory:', error);
    return null;
  }
  return data;
};

export const deletePeopleMemory = async (personId: string): Promise<void> => {
  const { error } = await supabase.from('people_memory').delete().eq('id', personId);
  if (error) {
    console.error('Error deleting person from memory:', error);
    throw error;
  }
};

// --- Custom Dashboard Cards API calls ---
export const fetchCustomDashboardCards = async (userId: string): Promise<CustomDashboardCard[]> => {
  const { data, error } = await supabase.from('custom_dashboard_cards').select('*').eq('user_id', userId).order('card_order');
  if (error) {
    console.error('Error fetching custom dashboard cards:', error);
    return [];
  }
  return data;
};

export const upsertCustomDashboardCard = async (cardData: Partial<CustomDashboardCard>): Promise<CustomDashboardCard | null> => {
  const { data, error } = await supabase.from('custom_dashboard_cards').upsert(cardData).select().single();
  if (error) {
    console.error('Error upserting custom dashboard card:', error);
    return null;
  }
  return data;
};

export const deleteCustomDashboardCard = async (cardId: string): Promise<void> => {
  const { error } = await supabase.from('custom_dashboard_cards').delete().eq('id', cardId);
  if (error) {
    console.error('Error deleting custom dashboard card:', error);
    throw error;
  }
};