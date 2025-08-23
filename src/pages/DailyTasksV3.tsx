import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, isToday, isPast, parseISO, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, Plus, GripVertical, Check, X, Edit, Trash2, ChevronLeft, ChevronRight, Clock, Repeat, Tag, List, CalendarDays, Info, Star, Sun, Moon, Cloud, Droplet, Wind, Thermometer, AlertCircle, CheckCircle, Circle, Loader2, Search, Filter, Settings, LayoutGrid, ListTodo, BarChart3, Users, Bell, MessageSquare, HelpCircle, LogOut, User, Home, Briefcase, Heart, BookOpen, Coffee, Utensils, ShoppingCart, Plane, Car, Gift, Camera, Music, Film, Gamepad, Code, Flask, Palette, PenTool, Mic, Headphones, Wifi, BatteryCharging, Globe, MapPin, DollarSign, Percent, CreditCard, Banknote, Shield, Lock, Key, Fingerprint, Eye, EyeOff, Link, Paperclip, Share2, Download, Upload, Printer, Save, Copy, Scissors, Undo, Redo, RotateCcw, RefreshCcw, Maximize, Minimize, Fullscreen, Shrink, ZoomIn, ZoomOut, VolumeX, Volume1, Volume2, Volume, Play, Pause, Stop, SkipForward, SkipBack, FastForward, Rewind, Shuffle, Repeat1, Repeat2, RepeatOff, MicOff, HeadphonesOff, WifiOff, Battery, BatteryLow, BatteryMedium, BatteryFull, Bluetooth, BluetoothOff, Usb, HardDrive, Server, CloudOff, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudDrizzle, CloudSun, CloudMoon, SunDim, MoonStar, Sunrise, Sunset, Droplets, Cloudy, Tornado, Wind, Snowflake, Fire, Zap, Umbrella, Anchor, Award, Barcode, Baseline, Beaker, BellRing, Bike, Binary, Bird, Book, Bookmark, Box, BriefcaseBusiness, Brush, Bug, Building, Bus, Cable, Calculator, CalendarCheck, CalendarClock, CalendarOff, CameraOff, CarFront, Cast, Cctv, ChartArea, ChartBar, ChartLine, ChartPie, CheckSquare, Chrome, CircleDollarSign, CircleDot, CircleEllipsis, CircleHelp, CircleMinus, CircleParking, CirclePlay, CirclePlus, CircleSlash, CircleUser, CircleX, Clipboard, Clock1, Clock10, Clock11, Clock12, Clock2, Clock3, Clock4, Clock5, Clock6, Clock7, Clock8, Clock9, CloudCog, Code2, Codesandbox, Coffee, Cog, Coins, Columns, Command, Compass, Component, ConciergeBell, Construction, Contact, Contrast, Cookie, Copyleft, Copyright, CornerDownLeft, CornerDownRight, CornerLeftDown, CornerLeftUp, CornerRightDown, CornerRightUp, CornerUpLeft, CornerUpRight, Cpu, CreditCard, Crop, Cross, Crosshair, Crown, Cube, CupSoda, Currency, Database, Delete, Diamond, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Dices, Diff, Disc, Divide, Dna, Dog, DollarSign, DoorClosed, DoorOpen, Dot, DownloadCloud, Dribbble, Droplet, Droplets, Drumstick, Edit2, Edit3, Egg, Equal, EqualNot, Eraser, Euro, Expand, ExternalLink, EyeOff, Facebook, Factory, Fan, FastForward, Feather, Figma, File, FileArchive, FileAudio, FileCode, FileEdit, FileHeart, FileImage, FileInput, FileJson, FileKey, FileMinus, FileOutput, FilePen, FilePlus, FileQuestion, FileSearch, FileText, FileVideo, FileWarning, FileX, Files, Film, Filter, FilterX, Fingerprint, Fish, Flag, FlagOff, FlagTriangleLeft, FlagTriangleRight, Flame, Flashlight, FlashlightOff, FlaskConical, FlaskRound, FlipHorizontal, FlipVertical, Flower, Folder, FolderArchive, FolderDot, FolderEdit, FolderGit2, FolderGit, FolderHeart, FolderInput, FolderKanban, FolderKey, FolderLock, FolderMinus, FolderOpen, FolderOutput, FolderPen, FolderPlus, FolderSearch, FolderSymlink, FolderTree, FolderX, Folders, FormInput, Forward, Frame, Frown, FunctionSquare, GalleryHorizontal, GalleryVertical, Gamepad2, GanttChart, Gauge, Gavel, Gem, Ghost, Gift, GitBranch, GitCommit, GitCompare, GitFork, GitGraph, GitMerge, GitPullRequest, Github, Gitlab, GlassWater, Glasses, Globe, Globe2, Goal, Grab, GraduationCap, Grape, Grid, Grip, Group, Hammer, Hand, HandMetal, HardDrive, HardHat, Hash, Haze, Headphones, Heart, HeartCrack, HeartHandshake, HelpCircle, Hexagon, Highlighter, History, Home, Hop, Hourglass, Html5, HttpLink, Image, ImageMinus, ImageOff, ImagePlus, Import, Inbox, Indent, IndianRupee, Infinity, Info, Inspect, Instagram, Italic, JapaneseYen, Joystick, Kanban, Key, Keyboard, Lamp, LampCeiling, LampDesk, LampFloor, LampWall, Languages, Laptop, Laptop2, Lasso, LassoSelect, Laugh, Layers, Layout, LayoutDashboard, LayoutGrid, LayoutList, LayoutPanel, LayoutTemplate, Leaf, LifeBuoy, Lightbulb, LightbulbOff, LineChart, Link, Link2, Link2Off, Linkedin, List, ListChecks, ListEnd, ListMinus, ListMusic, ListOrdered, ListPlus, ListRestart, ListStart, ListTodo, ListX, Loader, Loader2, Locate, LocateFixed, Lock, LogIn, LogOut, Lottie, Luggage, Mails, Map, MapPin, MapPinOff, Martini, Maximize, Maximize2, Medal, Megaphone, Meh, Menu, MenuSquare, Merge, MessageCircle, MessageSquare, MessageSquareDashed, Mic, Mic2, MicOff, Microscope, Microwave, Milestone, Minimize, Minimize2, Minus, MinusCircle, MinusSquare, Monitor, MonitorCheck, MonitorDot, MonitorOff, MonitorPause, MonitorPlay, MonitorSpeaker, MonitorStop, MonitorX, Moon, MoreHorizontal, MoreVertical, Mountain, MountainSnow, Mouse, MousePointer, Move, MoveDiagonal, MoveDiagonal2, MoveHorizontal, MoveVertical, Music, Music2, Navigation, Navigation2, Network, Newspaper, Nfc, Notebook, NotebookPen, NotebookTabs, Nut, Octagon, Package, Package2, PackageCheck, PackageMinus, PackagePlus, PackageSearch, PackageX, PaintBucket, Paintbrush, Paintbrush2, Palette, PanelBottom, PanelBottomClose, PanelLeft, PanelLeftClose, PanelRight, PanelRightClose, PanelTop, PanelTopClose, Paperclip, Parachute, Parentheses, ParkingMeter, PartyPopper, Pause, PauseCircle, PauseOctagon, Pen, PenTool, Pencil, Percent, PersonStanding, Phone, PhoneCall, PhoneForwarded, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, PhonePaused, PictureInPicture, PictureInPicture2, PieChart, PiggyBank, Pin, PinOff, Pipette, Plane, PlaneLanding, PlaneTakeoff, Play, PlayCircle, Plug, Plug2, PlugZap, Plus, PlusCircle, PlusSquare, Pocket, Podcast, Pointer, PoundSterling, Power, PowerOff, Printer, Projector, Puzzle, QrCode, Quote, Radio, RadioReceiver, RadioTower, Rat, Receipt, RectangleHorizontal, RectangleVertical, Recycle, Redo, RefreshCcw, RefreshCw, Regex, Refrigerator, RemoveFormatting, Repeat, Repeat1, Repeat2, Replace, ReplaceAll, Reply, ReplyAll, Rewind, Rocket, RockingChair, Rotate3d, RotateCcw, RotateCw, Router, Rows3, Rss, Ruler, RussianRuble, Sailboat, Salad, Sandwich, Satellite, SatelliteDish, Save, SaveAll, Scale, Scale3d, Scaling, Scan, ScanBarcode, ScanEye, ScanFace, ScanLine, ScanSearch, ScanText, Scissors, ScreenShare, ScreenShareOff, Scroll, Search, SearchCheck, SearchCode, SearchMinus, SearchPlus, Send, SeparatorHorizontal, SeparatorVertical, Server, ServerCog, ServerCrash, ServerOff, Settings, Settings2, Share, Share2, Sheet, Shield, ShieldAlert, ShieldCheck, ShieldClose, ShieldOff, ShieldQuestion, Ship, ShoppingBag, ShoppingCart, Shovel, ShowerHead, Shrink, Shuffle, Sidebar, SidebarClose, SidebarOpen, Sigma, Signal, SignalHigh, SignalLow, SignalMedium, SignalZero, Siren, SkipBack, SkipForward, Skull, Slack, Slash, Slice, Sliders, SlidersHorizontal, Smartphone, SmartphoneCharging, SmartphoneNfc, Smile, SmilePlus, Snowflake, Sofa, SortAsc, SortDesc, Speaker, Speech, Square, SquareAsterisk, SquareDot, SquareEqual, SquareKanban, SquareMinus, SquareParking, SquarePen, SquarePlus, SquareStack, SquareTerminal, SquareUser, SquareX, Stack, Star, StarHalf, StarOff, Stars, StepBack, StepForward, Stethoscope, Sticker, StickyNote, StopCircle, Store, StretchHorizontal, StretchVertical, Strikethrough, Subscript, Subtitles, Sun, Sunrise, Sunset, Superscript, SwatchBook, SwissFranc, SwitchCamera, Sword, Swords, Table, Table2, Tablet, Tablets, Tag, Tags, Target, Tent, Terminal, TerminalSquare, TestTube, TestTube2, TestTubes, Text, TextCursor, TextCursorInput, TextSelect, Thermometer, ThermometerSnowflake, ThermometerSun, ThumbsDown, ThumbsUp, Ticket, Timer, TimerOff, TimerReset, ToggleLeft, ToggleRight, Tornado, ToyBrick, Train, Tram, Trash, Trash2, TreeDeciduous, TreePine, Trees, Trello, TrendingDown, TrendingUp, Triangle, TriangleAlert, TriangleRight, Truck, Tv, Twitch, Twitter, Type, TypeIcon, Umbrella, Underline, Undo, Undo2, Ungroup, Unlink, Unlink2, Unlock, Upload, UploadCloud, Usb, User, UserCheck, UserCog, UserMinus, UserPlus, UserX, Users, Utensils, UtensilsCrossed, Variable, Vegan, VenetianMask, Verified, Vibrate, Video, VideoOff, View, Voicemail, Volume, Volume1, Volume2, VolumeX, Vote, Wallet, Wallet2, Wand, Wand2, Warehouse, Watch, Waves, Webcam, Webhook, Weight, Wheat, Wifi, WifiOff, Wind, Wine, WineOff, Workflow, X, XCircle, XOctagon, XSquare, Youtube, Zap, ZapOff, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';

// Type Definitions
type TaskStatus = 'to-do' | 'completed' | 'in-progress';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type RecurringType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  created_at: string;
  user_id: string;
  priority: TaskPriority;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number;
  parent_task_id: string | null;
  recurring_type: RecurringType;
  original_task_id: string | null;
  category: string | null;
  link: string | null;
  image_url: string | null;
  subtasks?: Task[];
}

interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number;
  created_at: string;
  include_in_focus_mode: boolean;
  tasks: Task[];
}

interface TaskCategory {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

// Supabase Data Fetching and Mutations
const fetchTaskSections = async (): Promise<TaskSection[]> => {
  const { data: sections, error: sectionsError } = await supabase
    .from('task_sections')
    .select('*')
    .order('order', { ascending: true });

  if (sectionsError) throw new Error(sectionsError.message);

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .order('order', { ascending: true });

  if (tasksError) throw new Error(tasksError.message);

  const sectionMap = new Map<string, TaskSection>(
    sections.map((section) => ({ ...section, tasks: [] })).map((section) => [section.id, section])
  );

  const topLevelTasks = tasks.filter((task) => !task.parent_task_id);
  const subtasks = tasks.filter((task) => task.parent_task_id);

  const buildTaskTree = (parentTasks: Task[], allTasks: Task[]): Task[] => {
    return parentTasks.map((task) => ({
      ...task,
      subtasks: buildTaskTree(
        allTasks.filter((sub) => sub.parent_task_id === task.id).sort((a, b) => a.order - b.order),
        allTasks
      ),
    }));
  };

  const tasksWithSubtasks = buildTaskTree(topLevelTasks, tasks);

  tasksWithSubtasks.forEach((task) => {
    if (task.section_id && sectionMap.has(task.section_id)) {
      sectionMap.get(task.section_id)?.tasks.push(task);
    }
  });

  return Array.from(sectionMap.values());
};

const addTask = async (newTask: Partial<Task>): Promise<Task> => {
  const { data, error } = await supabase.from('tasks').insert(newTask).select().single();
  if (error) throw new Error(error.message);
  return data;
};

const updateTask = async (updatedTask: Partial<Task>): Promise<Task> => {
  const { data, error } = await supabase.from('tasks').update(updatedTask).eq('id', updatedTask.id).select().single();
  if (error) throw new Error(error.message);
  return data;
};

const deleteTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw new Error(error.message);
};

const addSection = async (newSection: Partial<TaskSection>): Promise<TaskSection> => {
  const { data, error } = await supabase.from('task_sections').insert(newSection).select().single();
  if (error) throw new Error(error.message);
  return data;
};

const updateSection = async (updatedSection: Partial<TaskSection>): Promise<TaskSection> => {
  const { data, error } = await supabase
    .from('task_sections')
    .update(updatedSection)
    .eq('id', updatedSection.id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const deleteSection = async (sectionId: string): Promise<void> => {
  const { error } = await supabase.from('task_sections').delete().eq('id', sectionId);
  if (error) throw new Error(error.message);
};

const updateTaskOrders = async (updates: { id: string; order: number; section_id: string | null; parent_task_id: string | null }[]) => {
  const { error } = await supabase.rpc('update_tasks_order', { updates });
  if (error) throw new Error(error.message);
};

const updateSectionOrders = async (updates: { id: string; order: number; name: string; include_in_focus_mode: boolean }[]) => {
  const { error } = await supabase.rpc('update_sections_order', { updates });
  if (error) throw new Error(error.message);
};

const fetchTaskCategories = async (): Promise<TaskCategory[]> => {
  const { data, error } = await supabase.from('task_categories').select('*');
  if (error) throw new Error(error.message);
  return data;
};

const addCategory = async (newCategory: Partial<TaskCategory>): Promise<TaskCategory> => {
  const { data, error } = await supabase.from('task_categories').insert(newCategory).select().single();
  if (error) throw new Error(error.message);
  return data;
};

const updateCategory = async (updatedCategory: Partial<TaskCategory>): Promise<TaskCategory> => {
  const { data, error } = await supabase
    .from('task_categories')
    .update(updatedCategory)
    .eq('id', updatedCategory.id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const deleteCategory = async (categoryId: string): Promise<void> => {
  const { error } = await supabase.from('task_categories').delete().eq('id', categoryId);
  if (error) throw new Error(error.message);
};

// Helper Components
const PriorityBadge: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
  const colors = {
    low: 'bg-gray-200 text-gray-800',
    medium: 'bg-blue-200 text-blue-800',
    high: 'bg-orange-200 text-orange-800',
    urgent: 'bg-red-200 text-red-800',
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority]}`}>{priority}</span>;
};

const CategoryBadge: React.FC<{ category: TaskCategory }> = ({ category }) => {
  return (
    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: category.color, color: 'white' }}>
      {category.name}
    </span>
  );
};

const TaskForm: React.FC<{
  initialTask?: Task | null;
  sectionId?: string | null;
  parentTaskId?: string | null;
  onSave: (task: Partial<Task>) => void;
  onClose: () => void;
  categories: TaskCategory[];
  sections: TaskSection[];
}> = ({ initialTask, sectionId, parentTaskId, onSave, onClose, categories, sections }) => {
  const [description, setDescription] = useState(initialTask?.description || '');
  const [priority, setPriority] = useState<TaskPriority>(initialTask?.priority || 'medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(initialTask?.due_date ? parseISO(initialTask.due_date) : undefined);
  const [notes, setNotes] = useState(initialTask?.notes || '');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(sectionId || initialTask?.section_id || null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialTask?.category || null);
  const [recurringType, setRecurringType] = useState<RecurringType>(initialTask?.recurring_type || 'none');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Task description cannot be empty.');
      return;
    }
    onSave({
      ...initialTask,
      description,
      priority,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      notes,
      section_id: selectedSectionId,
      parent_task_id: parentTaskId,
      category: selectedCategory,
      recurring_type: recurringType,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Task description"
          className="mt-1"
        />
      </div>

      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
          Priority
        </label>
        <Select value={priority} onValueChange={(value: TaskPriority) => setPriority(value)}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <Select value={selectedCategory || ''} onValueChange={setSelectedCategory}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="section" className="block text-sm font-medium text-gray-700">
          Section
        </label>
        <Select value={selectedSectionId || ''} onValueChange={setSelectedSectionId}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select section" />
          </SelectTrigger>
          <SelectContent>
            {sections.map((sec) => (
              <SelectItem key={sec.id} value={sec.id}>
                {sec.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
          Due Date
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={'outline'}
              className={cn(
                'w-full justify-start text-left font-normal mt-1',
                !dueDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? format(dueDate, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <label htmlFor="recurringType" className="block text-sm font-medium text-gray-700">
          Recurring
        </label>
        <Select value={recurringType} onValueChange={(value: RecurringType) => setRecurringType(value)}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select recurrence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any additional notes"
          className="mt-1"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save Task</Button>
      </DialogFooter>
    </form>
  );
};

const SectionForm: React.FC<{
  initialSection?: TaskSection | null;
  onSave: (section: Partial<TaskSection>) => void;
  onClose: () => void;
}> = ({ initialSection, onSave, onClose }) => {
  const [name, setName] = useState(initialSection?.name || '');
  const [includeInFocusMode, setIncludeInFocusMode] = useState(initialSection?.include_in_focus_mode ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Section name cannot be empty.');
      return;
    }
    onSave({ ...initialSection, name, include_in_focus_mode: includeInFocusMode });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Section Name
        </label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Section name" className="mt-1" />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="includeInFocusMode"
          checked={includeInFocusMode}
          onCheckedChange={(checked) => setIncludeInFocusMode(checked as boolean)}
        />
        <label htmlFor="includeInFocusMode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Include in Focus Mode
        </label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Tasks in sections included in Focus Mode will appear in your daily focus view.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save Section</Button>
      </DialogFooter>
    </form>
  );
};

const CategoryForm: React.FC<{
  initialCategory?: TaskCategory | null;
  onSave: (category: Partial<TaskCategory>) => void;
  onClose: () => void;
}> = ({ initialCategory, onSave, onClose }) => {
  const [name, setName] = useState(initialCategory?.name || '');
  const [color, setColor] = useState(initialCategory?.color || '#000000');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Category name cannot be empty.');
      return;
    }
    onSave({ ...initialCategory, name, color });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Category Name
        </label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" className="mt-1" />
      </div>
      <div>
        <label htmlFor="color" className="block text-sm font-medium text-gray-700">
          Color
        </label>
        <Input id="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 h-10 w-full" />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save Category</Button>
      </DialogFooter>
    </form>
  );
};

const TaskItem: React.FC<{
  task: Task;
  index: number;
  categories: TaskCategory[];
  sections: TaskSection[];
  onUpdateTask: (task: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (newTask: Partial<Task>) => void;
}> = ({ task, index, categories, sections, onUpdateTask, onDeleteTask, onAddTask }) => {
  const [isEditing, setIsEditing] = useState(false);
  const category = categories.find((cat) => cat.id === task.category);

  const handleToggleComplete = () => {
    onUpdateTask({ ...task, status: task.status === 'completed' ? 'to-do' : 'completed' });
  };

  const handleSaveTask = (updatedTask: Partial<Task>) => {
    onUpdateTask(updatedTask);
    setIsEditing(false);
  };

  const handleAddSubtask = (newTask: Partial<Task>) => {
    onAddTask({ ...newTask, parent_task_id: task.id, section_id: task.section_id });
  };

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'completed';
  const isDueToday = task.due_date && isToday(parseISO(task.due_date)) && task.status !== 'completed';

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            'bg-white p-3 rounded-md shadow-sm border border-gray-200 mb-2',
            task.status === 'completed' && 'opacity-60 line-through',
            isOverdue && 'border-red-400 bg-red-50',
            isDueToday && 'border-orange-400 bg-orange-50'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-grow">
              <span {...provided.dragHandleProps} className="mr-2 text-gray-400 cursor-grab">
                <GripVertical className="h-4 w-4" />
              </span>
              <Checkbox checked={task.status === 'completed'} onCheckedChange={handleToggleComplete} className="mr-3" />
              <div className="flex-grow">
                <p className="text-sm font-medium text-gray-800">{task.description}</p>
                <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                  {task.due_date && (
                    <span className="flex items-center">
                      <CalendarDays className="h-3 w-3 mr-1" /> {format(parseISO(task.due_date), 'MMM d')}
                    </span>
                  )}
                  {task.priority && <PriorityBadge priority={task.priority} />}
                  {category && <CategoryBadge category={category} />}
                  {task.recurring_type !== 'none' && (
                    <span className="flex items-center">
                      <Repeat className="h-3 w-3 mr-1" /> {task.recurring_type}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{task.description}</DialogTitle>
                  </DialogHeader>
                  <TaskForm
                    initialTask={task}
                    onSave={handleSaveTask}
                    onClose={() => setIsEditing(false)}
                    categories={categories}
                    sections={sections}
                  />
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => onDeleteTask(task.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Subtask to "{task.description}"</DialogTitle>
                  </DialogHeader>
                  <TaskForm
                    parentTaskId={task.id}
                    sectionId={task.section_id}
                    onSave={handleAddSubtask}
                    onClose={() => {}}
                    categories={categories}
                    sections={sections}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="ml-8 mt-2 border-l pl-4">
              {task.subtasks.map((subtask, subIndex) => (
                <TaskItem
                  key={subtask.id}
                  task={subtask}
                  index={subIndex}
                  categories={categories}
                  sections={sections}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onAddTask={onAddTask}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

const DailyTasksV3: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isAddSectionDialogOpen, setIsAddSectionDialogOpen] = useState(false);
  const [isManageCategoriesDialogOpen, setIsManageCategoriesDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<TaskSection | null>(null);
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string | 'all'>('all');

  const {
    data: sections = [],
    isLoading: isLoadingSections,
    error: sectionsError,
  } = useQuery<TaskSection[], Error>({
    queryKey: ['taskSections'],
    queryFn: fetchTaskSections,
  });

  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useQuery<TaskCategory[], Error>({
    queryKey: ['taskCategories'],
    queryFn: fetchTaskCategories,
  });

  const addTaskMutation = useMutation({
    mutationFn: addTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections'] });
      toast.success('Task added successfully!');
      setIsAddTaskDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to add task: ${error.message}`);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: updateTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections'] });
      toast.success('Task updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections'] });
      toast.success('Task deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete task: ${error.message}`);
    },
  });

  const addSectionMutation = useMutation({
    mutationFn: addSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections'] });
      toast.success('Section added successfully!');
      setIsAddSectionDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to add section: ${error.message}`);
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: updateSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections'] });
      toast.success('Section updated successfully!');
      setEditingSection(null);
    },
    onError: (error) => {
      toast.error(`Failed to update section: ${error.message}`);
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: deleteSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections'] });
      toast.success('Section deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete section: ${error.message}`);
    },
  });

  const updateTaskOrdersMutation = useMutation({
    mutationFn: updateTaskOrders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections'] });
      toast.success('Task order updated!');
    },
    onError: (error) => {
      toast.error(`Failed to update task order: ${error.message}`);
    },
  });

  const updateSectionOrdersMutation = useMutation({
    mutationFn: updateSectionOrders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections'] });
      toast.success('Section order updated!');
    },
    onError: (error) => {
      toast.error(`Failed to update section order: ${error.message}`);
    },
  });

  const addCategoryMutation = useMutation({
    mutationFn: addCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskCategories'] });
      toast.success('Category added successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to add category: ${error.message}`);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: updateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskCategories'] });
      toast.success('Category updated successfully!');
      setEditingCategory(null);
    },
    onError: (error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskCategories'] });
      toast.success('Category deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });

  const handleAddTask = (newTask: Partial<Task>) => {
    addTaskMutation.mutate({ ...newTask, user_id: supabase.auth.currentUser?.id || '' });
  };

  const handleUpdateTask = (updatedTask: Partial<Task>) => {
    updateTaskMutation.mutate(updatedTask);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };

  const handleAddSection = (newSection: Partial<TaskSection>) => {
    addSectionMutation.mutate({ ...newSection, user_id: supabase.auth.currentUser?.id || '', order: sections.length });
  };

  const handleUpdateSection = (updatedSection: Partial<TaskSection>) => {
    updateSectionMutation.mutate(updatedSection);
  };

  const handleDeleteSection = (sectionId: string) => {
    deleteSectionMutation.mutate(sectionId);
  };

  const handleAddCategory = (newCategory: Partial<TaskCategory>) => {
    addCategoryMutation.mutate({ ...newCategory, user_id: supabase.auth.currentUser?.id || '' });
  };

  const handleUpdateCategory = (updatedCategory: Partial<TaskCategory>) => {
    updateCategoryMutation.mutate(updatedCategory);
  };

  const handleDeleteCategory = (categoryId: string) => {
    deleteCategoryMutation.mutate(categoryId);
  };

  const filteredSections = useMemo(() => {
    if (!sections) return [];

    return sections
      .map((section) => {
        const filteredTasks = section.tasks
          .filter((task) => {
            const matchesSearch = task.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
            const matchesCategory = filterCategory === 'all' || task.category === filterCategory;

            // Filter by date: only show tasks due on or before the current date, or tasks without a due date
            const taskDueDate = task.due_date ? parseISO(task.due_date) : null;
            const isRelevantDate =
              !taskDueDate ||
              isSameDay(taskDueDate, currentDate) ||
              (isPast(taskDueDate) && !isSameDay(taskDueDate, currentDate) && task.status !== 'completed');

            return matchesSearch && matchesPriority && matchesCategory && isRelevantDate;
          })
          .sort((a, b) => a.order - b.order); // Ensure tasks within sections are sorted

        return { ...section, tasks: filteredTasks };
      })
      .filter((section) => section.tasks.length > 0 || searchTerm || filterPriority !== 'all' || filterCategory !== 'all');
  }, [sections, searchTerm, filterPriority, filterCategory, currentDate]);

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, type } = result;

      if (!destination) {
        return;
      }

      if (destination.droppableId === source.droppableId && destination.index === source.index) {
        return;
      }

      if (type === 'section') {
        const newSections = Array.from(sections);
        const [movedSection] = newSections.splice(source.index, 1);
        newSections.splice(destination.index, 0, movedSection);

        const updates = newSections.map((section, index) => ({
          id: section.id,
          order: index,
          name: section.name,
          include_in_focus_mode: section.include_in_focus_mode,
        }));
        await updateSectionOrdersMutation.mutateAsync(updates);
      } else if (type === 'task') {
        const sourceSectionId = source.droppableId;
        const destinationSectionId = destination.droppableId;

        const newSections = JSON.parse(JSON.stringify(sections)); // Deep copy to avoid direct state mutation
        const sourceSection = newSections.find((sec: TaskSection) => sec.id === sourceSectionId);
        const destinationSection = newSections.find((sec: TaskSection) => sec.id === destinationSectionId);

        if (!sourceSection || !destinationSection) return;

        let movedTask: Task;

        // Handle subtask dragging (not fully implemented in this dnd setup, but good to consider)
        // For simplicity, assuming only top-level tasks are dragged between sections for now.
        // If subtasks were draggable, this logic would need to be more complex to find and remove them from nested arrays.

        // Remove from source
        const [removed] = sourceSection.tasks.splice(source.index, 1);
        movedTask = removed;

        // Add to destination
        destinationSection.tasks.splice(destination.index, 0, movedTask);

        // Update orders and section_ids
        const taskUpdates: { id: string; order: number; section_id: string | null; parent_task_id: string | null }[] = [];

        sourceSection.tasks.forEach((task: Task, index: number) => {
          if (task.order !== index || task.section_id !== sourceSection.id) {
            taskUpdates.push({ id: task.id, order: index, section_id: sourceSection.id, parent_task_id: task.parent_task_id });
          }
        });

        destinationSection.tasks.forEach((task: Task, index: number) => {
          if (task.order !== index || task.section_id !== destinationSection.id) {
            taskUpdates.push({ id: task.id, order: index, section_id: destinationSection.id, parent_task_id: task.parent_task_id });
          }
        });

        if (taskUpdates.length > 0) {
          await updateTaskOrdersMutation.mutateAsync(taskUpdates);
        }
      }
    },
    [sections, updateSectionOrdersMutation, updateTaskOrdersMutation]
  );

  if (isLoadingSections || isLoadingCategories) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="ml-2 text-gray-600">Loading tasks...</p>
      </div>
    );
  }

  if (sectionsError || categoriesError) {
    return (
      <div className="text-center p-4 text-red-600">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <p>Error loading data: {sectionsError?.message || categoriesError?.message}</p>
      </div>
    );
  }

  const daysOfWeek = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDate]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <ListTodo className="mr-3 h-8 w-8 text-blue-600" /> Daily Tasks
        </h1>

        {/* Date Navigation */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm mb-6">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex space-x-2">
            {daysOfWeek.map((day) => (
              <Button
                key={day.toISOString()}
                variant={isSameDay(day, currentDate) ? 'default' : 'outline'}
                onClick={() => setCurrentDate(day)}
                className="flex flex-col h-auto w-16 py-2"
              >
                <span className="text-xs font-medium">{format(day, 'EEE')}</span>
                <span className="text-lg font-bold">{format(day, 'd')}</span>
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="relative flex-grow max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterPriority} onValueChange={(value: TaskPriority | 'all') => setFilterPriority(value)}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4 text-gray-500" />
              <SelectValue placeholder="Filter by Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={(value: string | 'all') => setFilterCategory(value)}>
            <SelectTrigger className="w-[180px]">
              <Tag className="mr-2 h-4 w-4 text-gray-500" />
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-shrink-0">
                <Plus className="mr-2 h-4 w-4" /> Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <TaskForm onSave={handleAddTask} onClose={() => setIsAddTaskDialogOpen(false)} categories={categories} sections={sections} />
            </DialogContent>
          </Dialog>

          <Dialog open={isAddSectionDialogOpen} onOpenChange={setIsAddSectionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-shrink-0">
                <List className="mr-2 h-4 w-4" /> Add Section
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Section</DialogTitle>
              </DialogHeader>
              <SectionForm onSave={handleAddSection} onClose={() => setIsAddSectionDialogOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={isManageCategoriesDialogOpen} onOpenChange={setIsManageCategoriesDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-shrink-0">
                <Settings className="mr-2 h-4 w-4" /> Manage Categories
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Manage Categories</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 p-4">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-2 border rounded-md">
                    <span className="font-medium" style={{ color: category.color }}>
                      {category.name}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingCategory(category)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Edit Category</DialogTitle>
                          </DialogHeader>
                          <CategoryForm
                            initialCategory={editingCategory}
                            onSave={handleUpdateCategory}
                            onClose={() => setEditingCategory(null)}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDeleteCategory(category.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Plus className="mr-2 h-4 w-4" /> Add New Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add New Category</DialogTitle>
                    </DialogHeader>
                    <CategoryForm onSave={handleAddCategory} onClose={() => {}} />
                  </DialogContent>
                </Dialog>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="sections" type="section">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                {filteredSections.length === 0 && (
                  <div className="text-center text-gray-500 p-8 bg-white rounded-lg shadow-sm">
                    <ListTodo className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No tasks found for this day or filters.</p>
                    <p className="text-sm">Try adjusting your date or filters, or add a new task!</p>
                  </div>
                )}
                {filteredSections.map((section, sectionIndex) => (
                  <Draggable key={section.id} draggableId={section.id} index={sectionIndex}>
                    {(providedSection) => (
                      <div
                        ref={providedSection.innerRef}
                        {...providedSection.draggableProps}
                        className="bg-white rounded-lg shadow-md p-4"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <span {...providedSection.dragHandleProps} className="mr-3 text-gray-400 cursor-grab">
                              <GripVertical className="h-5 w-5" />
                            </span>
                            <h2 className="text-xl font-semibold text-gray-800">{section.name}</h2>
                            {section.include_in_focus_mode && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Star className="ml-2 h-4 w-4 text-yellow-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Included in Focus Mode</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Dialog open={editingSection?.id === section.id} onOpenChange={(open) => !open && setEditingSection(null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingSection(section)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Edit Section</DialogTitle>
                                </DialogHeader>
                                <SectionForm
                                  initialSection={editingSection}
                                  onSave={handleUpdateSection}
                                  onClose={() => setEditingSection(null)}
                                />
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDeleteSection(section.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <Droppable droppableId={section.id} type="task">
                          {(providedTask) => (
                            <div {...providedTask.droppableProps} ref={providedTask.innerRef} className="min-h-[50px]">
                              {section.tasks.map((task, taskIndex) => (
                                <TaskItem
                                  key={task.id}
                                  task={task}
                                  index={taskIndex}
                                  categories={categories}
                                  sections={sections}
                                  onUpdateTask={handleUpdateTask}
                                  onDeleteTask={handleDeleteTask}
                                  onAddTask={handleAddTask}
                                />
                              ))}
                              {providedTask.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
};

export default DailyTasksV3;