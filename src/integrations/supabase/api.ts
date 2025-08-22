import { supabase } from './client';
import { Task, TaskSection, TaskCategory, DoTodayOffLog, Appointment, Project, UserSettings, WorkHour, QuickLink, WeeklyFocus, GratitudeJournalEntry, WorryJournalEntry, SleepRecord, PeopleMemory, CustomDashboardCard, TaskPriority } from '@/types/task';
import { format } from 'date-fns';

// --- Tasks ---
export const fetchTasks = async (userId: string, viewMode: 'today' | 'all' | 'focus' | 'archive', currentDate: Date): Promise<Task[]> => {
  let query = supabase.from('tasks').select('*').eq('user_id', userId);

  if (viewMode === 'today') {
    const today = format(currentDate, 'yyyy-MM-dd');
    query = query.or(`due_date.eq.${today},recurring_type.eq.daily`);
    query = query.not('status', 'eq', 'completed');
    query = query.not('status', 'eq', 'archived');
  } else if (viewMode === 'archive') {
    query = query.eq('status', 'archived');
  } else if (viewMode === 'focus') {
    query = query.not('status', 'eq', 'completed');
    query = query.not('status', 'eq', 'archived');
    // Logic for focus mode tasks will be handled in the hook
  } else { // 'all'
    query = query.not('status', 'eq', 'archived');
  }

  const { data, error } = await query.order('order', { ascending: true }).order('created_at', { ascending: true });
  if (error) throw error;
  return data;
};

export const addTask = async (task: Partial<Task>): Promise<Task | null> => {
  const { data, error } = await supabase.from('tasks').insert(task).select().single();
  if (error) throw error;
  return data;
};

export const updateTask = async (id: string, updates: Partial<Task>): Promise<Task | null> => {
  const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteTask = async (id: string): Promise<void> => {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
};

export const updateTasksOrder = async (updates: { id: string; order: number | null; section_id: string | null; parent_task_id: string | null; }[]): Promise<void> => {
  const { error } = await supabase.rpc('update_tasks_order', { updates });
  if (error) throw error;
};

export const archiveAllCompletedTasks = async (userId: string): Promise<void> => {
  const { error } = await supabase.from('tasks').update({ status: 'archived' }).eq('user_id', userId).eq('status', 'completed');
  if (error) throw error;
};

// --- Sections ---
export const fetchSections = async (userId: string): Promise<TaskSection[]> => {
  const { data, error } = await supabase.from('task_sections').select('*').eq('user_id', userId).order('order', { ascending: true });
  if (error) throw error;
  return data;
};

export const addSection = async (section: Partial<TaskSection>): Promise<TaskSection | null> => {
  const { data, error } = await supabase.from('task_sections').insert(section).select().single();
  if (error) throw error;
  return data;
};

export const updateSection = async (id: string, updates: Partial<TaskSection>): Promise<TaskSection | null> => {
  const { data, error } = await supabase.from('task_sections').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteSection = async (id: string): Promise<void> => {
  const { error } = await supabase.from('task_sections').delete().eq('id', id);
  if (error) throw error;
};

// --- Categories ---
export const fetchCategories = async (userId: string): Promise<TaskCategory[]> => {
  const { data, error } = await supabase.from('task_categories').select('*').eq('user_id', userId).order('name', { ascending: true });
  if (error) throw error;
  return data;
};

export const addCategory = async (category: Partial<TaskCategory>): Promise<TaskCategory | null> => {
  const { data, error } = await supabase.from('task_categories').insert(category).select().single();
  if (error) throw error;
  return data;
};

export const updateCategory = async (id: string, updates: Partial<TaskCategory>): Promise<TaskCategory | null> => {
  const { data, error } = await supabase.from('task_categories').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const { error } = await supabase.from('task_categories').delete().eq('id', id);
  if (error) throw error;
};

// --- Do Today Off Log ---
export const fetchDoTodayOffLog = async (userId: string, date: string): Promise<DoTodayOffLog[]> => {
  const { data, error } = await supabase.from('do_today_off_log').select('*').eq('user_id', userId).eq('off_date', date);
  if (error) throw error;
  return data;
};

export const addDoTodayOffLog = async (log: { task_id: string; date: string; user_id: string }): Promise<void> => {
  const { error } = await supabase.from('do_today_off_log').insert({ task_id: log.task_id, off_date: log.date, user_id: log.user_id });
  if (error) throw error;
};

export const deleteDoTodayOffLog = async (log: { task_id: string; date: string; user_id: string }): Promise<void> => {
  const { error } = await supabase.from('do_today_off_log').delete().eq('task_id', log.task_id).eq('off_date', log.date).eq('user_id', log.user_id);
  if (error) throw error;
};

// --- Appointments ---
export const fetchAppointments = async (userId: string): Promise<Appointment[]> => {
  const { data, error } = await supabase.from('schedule_appointments').select('*').eq('user_id', userId).order('date', { ascending: true }).order('start_time', { ascending: true });
  if (error) throw error;
  return data;
};

export const addAppointment = async (appointment: Partial<Appointment>): Promise<Appointment | null> => {
  const { data, error } = await supabase.from('schedule_appointments').insert(appointment).select().single();
  if (error) throw error;
  return data;
};

export const updateAppointment = async (id: string, updates: Partial<Appointment>): Promise<Appointment | null> => {
  const { data, error } = await supabase.from('schedule_appointments').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteAppointment = async (id: string): Promise<void> => {
  const { error } = await supabase.from('schedule_appointments').delete().eq('id', id);
  if (error) throw error;
};

// --- Projects ---
export const fetchProjects = async (userId: string): Promise<Project[]> => {
  const { data, error } = await supabase.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) throw error;
  return data;
};

export const addProject = async (project: Partial<Project>): Promise<Project | null> => {
  const { data, error } = await supabase.from('projects').insert(project).select().single();
  if (error) throw error;
  return data;
};

export const updateProject = async (id: string, updates: Partial<Project>): Promise<Project | null> => {
  const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteProject = async (id: string): Promise<void> => {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
};

// --- User Settings ---
export const fetchUserSettings = async (userId: string): Promise<UserSettings | null> => {
  const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found
  return data;
};

export const updateUserSettings = async (userId: string, updates: Partial<UserSettings>): Promise<UserSettings | null> => {
  const { data, error } = await supabase.from('user_settings').upsert({ ...updates, user_id: userId }).eq('user_id', userId).select().single();
  if (error) throw error;
  return data;
};

// --- Work Hours ---
export const fetchUserWorkHours = async (userId: string): Promise<WorkHour[]> => {
  const { data, error } = await supabase.from('user_work_hours').select('*').eq('user_id', userId).order('day_of_week', { ascending: true });
  if (error) throw error;
  return data;
};

export const saveUserWorkHours = async (userId: string, workHours: WorkHour[]): Promise<void> => {
  const { error } = await supabase.from('user_work_hours').upsert(workHours.map(wh => ({ ...wh, user_id: userId })));
  if (error) throw error;
};

// --- Quick Links ---
export const fetchQuickLinks = async (userId: string): Promise<QuickLink[]> => {
  const { data, error } = await supabase.from('quick_links').select('*').eq('user_id', userId).order('link_order', { ascending: true });
  if (error) throw error;
  return data;
};

export const addQuickLink = async (link: Partial<QuickLink>): Promise<QuickLink | null> => {
  const { data, error } = await supabase.from('quick_links').insert(link).select().single();
  if (error) throw error;
  return data;
};

export const updateQuickLink = async (id: string, updates: Partial<QuickLink>): Promise<QuickLink | null> => {
  const { data, error } = await supabase.from('quick_links').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteQuickLink = async (id: string): Promise<void> => {
  const { error } = await supabase.from('quick_links').delete().eq('id', id);
  if (error) throw error;
};

// --- Weekly Focus ---
export const fetchWeeklyFocus = async (userId: string, weekStartDate: string): Promise<WeeklyFocus | null> => {
  const { data, error } = await supabase.from('weekly_focus').select('*').eq('user_id', userId).eq('week_start_date', weekStartDate).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const upsertWeeklyFocus = async (focus: Partial<WeeklyFocus>): Promise<WeeklyFocus | null> => {
  const { data, error } = await supabase.from('weekly_focus').upsert(focus).select().single();
  if (error) throw error;
  return data;
};

// --- Gratitude Journal ---
export const fetchGratitudeJournalEntries = async (userId: string): Promise<GratitudeJournalEntry[]> => {
  const { data, error } = await supabase.from('gratitude_journal_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const addGratitudeJournalEntry = async (entry: Partial<GratitudeJournalEntry>): Promise<GratitudeJournalEntry | null> => {
  const { data, error } = await supabase.from('gratitude_journal_entries').insert(entry).select().single();
  if (error) throw error;
  return data;
};

export const deleteGratitudeJournalEntry = async (id: string): Promise<void> => {
  const { error } = await supabase.from('gratitude_journal_entries').delete().eq('id', id);
  if (error) throw error;
};

// --- Worry Journal ---
export const fetchWorryJournalEntries = async (userId: string): Promise<WorryJournalEntry[]> => {
  const { data, error } = await supabase.from('worry_journal_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const addWorryJournalEntry = async (entry: Partial<WorryJournalEntry>): Promise<WorryJournalEntry | null> => {
  const { data, error } = await supabase.from('worry_journal_entries').insert(entry).select().single();
  if (error) throw error;
  return data;
};

export const deleteWorryJournalEntry = async (id: string): Promise<void> => {
  const { error } = await supabase.from('worry_journal_entries').delete().eq('id', id);
  if (error) throw error;
};

// --- Sleep Records ---
export const fetchSleepRecords = async (userId: string): Promise<SleepRecord[]> => {
  const { data, error } = await supabase.from('sleep_records').select('*').eq('user_id', userId).order('date', { ascending: false });
  if (error) throw error;
  return data;
};

export const addSleepRecord = async (record: Partial<SleepRecord>): Promise<SleepRecord | null> => {
  const { data, error } = await supabase.from('sleep_records').insert(record).select().single();
  if (error) throw error;
  return data;
};

export const updateSleepRecord = async (id: string, updates: Partial<SleepRecord>): Promise<SleepRecord | null> => {
  const { data, error } = await supabase.from('sleep_records').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteSleepRecord = async (id: string): Promise<void> => {
  const { error } = await supabase.from('sleep_records').delete().eq('id', id);
  if (error) throw error;
};

// --- People Memory ---
export const fetchPeopleMemory = async (userId: string): Promise<PeopleMemory[]> => {
  const { data, error } = await supabase.from('people_memory').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const addPeopleMemory = async (person: Partial<PeopleMemory>): Promise<PeopleMemory | null> => {
  const { data, error } = await supabase.from('people_memory').insert(person).select().single();
  if (error) throw error;
  return data;
};

export const updatePeopleMemory = async (id: string, updates: Partial<PeopleMemory>): Promise<PeopleMemory | null> => {
  const { data, error } = await supabase.from('people_memory').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deletePeopleMemory = async (id: string): Promise<void> => {
  const { error } = await supabase.from('people_memory').delete().eq('id', id);
  if (error) throw error;
};

// --- Custom Dashboard Cards ---
export const fetchCustomDashboardCards = async (userId: string): Promise<CustomDashboardCard[]> => {
  const { data, error } = await supabase.from('custom_dashboard_cards').select('*').eq('user_id', userId).order('card_order', { ascending: true });
  if (error) throw error;
  return data;
};

export const upsertCustomDashboardCard = async (card: Partial<CustomDashboardCard>): Promise<CustomDashboardCard | null> => {
  const { data, error } = await supabase.from('custom_dashboard_cards').upsert(card).select().single();
  if (error) throw error;
  return data;
};

export const deleteCustomDashboardCard = async (id: string): Promise<void> => {
  const { error } = await supabase.from('custom_dashboard_cards').delete().eq('id', id);
  if (error) throw error;
};

// --- Daily Briefing / Stats ---
export const getDailyTaskCounts = async (userId: string, date: string): Promise<DailyTaskCount> => {
  const { data: tasksData, error: tasksError } = await supabase
    .from('tasks')
    .select('id, status, due_date, recurring_type')
    .eq('user_id', userId);

  if (tasksError) throw tasksError;

  const today = new Date(date);
  let totalPendingCount = 0;
  let completedCount = 0;
  let overdueCount = 0;

  const doTodayOffLog = await fetchDoTodayOffLog(userId, date);
  const doTodayOffIds = new Set(doTodayOffLog.map(log => log.task_id));

  tasksData.forEach(task => {
    const isDueToday = task.due_date && format(new Date(task.due_date), 'yyyy-MM-dd') === date;
    const isRecurringDaily = task.recurring_type === 'daily';
    const isIncludedToday = (isDueToday || isRecurringDaily) && !doTodayOffIds.has(task.id);

    if (task.status === 'completed') {
      completedCount++;
    } else if (task.status === 'to-do' && isIncludedToday) {
      totalPendingCount++;
      if (task.due_date && new Date(task.due_date) < today) {
        overdueCount++;
      }
    }
  });

  return { totalPendingCount, completedCount, overdueCount };
};

export const getDailyBriefing = async (userId: string) => {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: tasksDueToday, error: tasksError } = await supabase
    .from('tasks')
    .select('id')
    .eq('user_id', userId)
    .eq('due_date', today)
    .eq('status', 'to-do');

  if (tasksError) throw tasksError;

  const { data: appointmentsToday, error: appointmentsError } = await supabase
    .from('schedule_appointments')
    .select('id')
    .eq('user_id', userId)
    .eq('date', today);

  if (appointmentsError) throw appointmentsError;

  return {
    tasksDueToday: tasksDueToday?.length || 0,
    appointmentsToday: appointmentsToday?.length || 0,
  };
};

export const suggestTaskDetails = async (description: string, categories: { id: string; name: string }[], currentDate: Date) => {
  // This is a placeholder for an actual AI suggestion API call
  // In a real app, this would call an Edge Function or external AI service
  console.log('AI Suggestion Request:', { description, categories, currentDate });

  // Simulate AI response
  const cleanedDescription = description.replace(/(tomorrow|today|high priority|low priority|urgent|medium priority)/gi, '').trim();
  const suggestedPriority: TaskPriority = description.toLowerCase().includes('urgent') ? 'urgent' :
                                         description.toLowerCase().includes('high priority') ? 'high' :
                                         description.toLowerCase().includes('low priority') ? 'low' : 'medium';
  const suggestedDueDate = description.toLowerCase().includes('tomorrow') ? format(new Date(currentDate.setDate(currentDate.getDate() + 1)), 'yyyy-MM-dd') :
                           description.toLowerCase().includes('today') ? format(currentDate, 'yyyy-MM-dd') : null;

  return {
    cleanedDescription,
    suggestedCategory: null, // Placeholder
    suggestedPriority,
    suggestedDueDate,
    suggestedNotes: null,
    suggestedRemindAt: null,
    suggestedSection: null,
    suggestedLink: null,
  };
};