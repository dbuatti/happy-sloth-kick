import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, isToday, isPast, parseISO, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, Plus as PlusIcon, GripVertical, Check, X, Edit, Trash2, ChevronLeft, ChevronRight, Clock, Repeat, Tag, List as ListIcon, CalendarDays, Info, Star, Sun, Moon, Cloud, Droplet, Wind, Thermometer, AlertCircle, CheckCircle, Circle, Loader2 as Loader2Icon, Search as SearchIcon, Filter as FilterIcon, Settings as SettingsIcon, LayoutGrid, ListTodo as ListTodoIcon, BarChart3, Users, Bell, MessageSquare, HelpCircle, LogOut, User, Home, Briefcase, Heart, BookOpen, Coffee, Utensils, ShoppingCart, Plane, Car, Gift, Camera, Music, Film, Gamepad, Code, Flask, Palette, PenTool, Mic, Headphones, Wifi, BatteryCharging, Globe, MapPin, DollarSign, Percent, CreditCard, Banknote, Shield, Lock, Key, Fingerprint, Eye, EyeOff, Link, Paperclip, Share2, Download, Upload, Printer, Save, Copy, Scissors, Undo, Redo, RotateCcw, RefreshCcw, Maximize, Minimize, Fullscreen, Shrink, ZoomIn, ZoomOut, VolumeX, Volume1, Volume2, Volume, Play, Pause, Stop, SkipForward, SkipBack, FastForward, Rewind, Shuffle, Repeat1, Repeat2, RepeatOff, MicOff, HeadphonesOff, WifiOff, Battery, BatteryLow, BatteryMedium, BatteryFull, Bluetooth, BluetoothOff, Usb, HardDrive, Server, CloudOff, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudDrizzle, CloudSun, CloudMoon, SunDim, MoonStar, Sunrise, Sunset, Droplets, Cloudy, Tornado, Wind, Snowflake, Fire, Zap, Umbrella, Anchor, Award, Barcode, Baseline, Beaker, BellRing, Bike, Binary, Bird, Book, Bookmark, Box, BriefcaseBusiness, Brush, Bug, Building, Bus, Cable, Calculator, CalendarCheck, CalendarClock, CalendarOff, CameraOff, CarFront, Cast, Cctv, ChartArea, ChartBar, ChartLine, ChartPie, CheckSquare, Chrome, CircleDollarSign, CircleDot, CircleEllipsis, CircleHelp, CircleMinus, CircleParking, CirclePlay, CirclePlus, CircleSlash, CircleUser, CircleX, Clipboard, Clock1, Clock10, Clock11, Clock12, Clock2, Clock3, Clock4, Clock5, Clock6, Clock7, Clock8, Clock9, CloudCog, Code2, Codesandbox, Coffee, Cog, Coins, Columns, Command, Compass, Component, ConciergeBell, Construction, Contact, Contrast, Cookie, Copyleft, Copyright, CornerDownLeft, CornerDownRight, CornerLeftDown, CornerLeftUp, CornerRightDown, CornerRightUp, CornerUpLeft, CornerUpRight, Cpu, CreditCard, Crop, Cross, Crosshair, Crown, Cube, CupSoda, Currency, Database, Delete, Diamond, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Dices, Diff, Disc, Divide, Dna, Dog, DollarSign, DoorClosed, DoorOpen, Dot, DownloadCloud, Dribbble, Droplet, Droplets, Drumstick, Edit2, Edit3, Egg, Equal, EqualNot, Eraser, Euro, Expand, ExternalLink, EyeOff, Facebook, Factory, Fan, FastForward, Feather, Figma, File, FileArchive, FileAudio, FileCode, FileEdit, FileHeart, FileImage, FileInput, FileJson, FileKey, FileMinus, FileOutput, FilePen, FilePlus, FileQuestion, FileSearch, FileText, FileVideo, FileWarning, FileX, Files, Film, Filter as FilterIcon2, FilterX, Fingerprint, Fish, Flag, FlagOff, FlagTriangleLeft, FlagTriangleRight, Flame, Flashlight, FlashlightOff, FlaskConical, FlaskRound, FlipHorizontal, FlipVertical, Flower, Folder, FolderArchive, FolderDot, FolderEdit, FolderGit2, FolderGit, FolderHeart, FolderInput, FolderKanban, FolderKey, FolderLock, FolderMinus, FolderOpen, FolderOutput, FolderPen, FolderPlus, FolderSearch, FolderSymlink, FolderTree, FolderX, Folders, FormInput, Forward, Frame, Frown, FunctionSquare, GalleryHorizontal, GalleryVertical, Gamepad2, GanttChart, Gauge, Gavel, Gem, Ghost, Gift, GitBranch, GitCommit, GitCompare, GitFork, GitGraph, GitMerge, GitPullRequest, Github, Gitlab, GlassWater, Glasses, Globe, Globe2, Goal, Grab, GraduationCap, Grape, Grid, Grip, Group, Hammer, Hand, HandMetal, HardDrive, HardHat, Hash, Haze, Headphones, Heart, HeartCrack, HeartHandshake, HelpCircle, Hexagon, Highlighter, History, Home, Hop, Hourglass, Html5, HttpLink, Image, ImageMinus, ImageOff, ImagePlus, Import, Inbox, Indent, IndianRupee, Infinity, Info, Inspect, Instagram, Italic, JapaneseYen, Joystick, Kanban, Key, Keyboard, Lamp, LampCeiling, LampDesk, LampFloor, LampWall, Languages, Laptop, Laptop2, Lasso, LassoSelect, Laugh, Layers, Layout, LayoutDashboard, LayoutGrid, LayoutList, LayoutPanel, LayoutTemplate, Leaf, LifeBuoy, Lightbulb, LightbulbOff, LineChart, Link, Link2, Link2Off, Linkedin, List, ListChecks, ListEnd, ListMinus, ListMusic, ListOrdered, ListPlus, ListRestart, ListStart, ListTodo, ListX, Loader, Loader2, Locate, LocateFixed, Lock, LogIn, LogOut, Lottie, Luggage, Mails, Map, MapPin, MapPinOff, Martini, Maximize, Maximize2, Medal, Megaphone, Meh, Menu, MenuSquare, Merge, MessageCircle, MessageSquare, MessageSquareDashed, Mic, Mic2, MicOff, Microscope, Microwave, Milestone, Minimize, Minimize2, Minus, MinusCircle, MinusSquare, Monitor, MonitorCheck, MonitorDot, MonitorOff, MonitorPause, MonitorPlay, MonitorSpeaker, MonitorStop, MonitorX, Moon, MoreHorizontal, MoreVertical, Mountain, MountainSnow, Mouse, MousePointer, Move, MoveDiagonal, MoveDiagonal2, MoveHorizontal, MoveVertical, Music, Music2, Navigation, Navigation2, Network, Newspaper, Nfc, Notebook, NotebookPen, NotebookTabs, Nut, Octagon, Package, Package2, PackageCheck, PackageMinus, PackagePlus, PackageSearch, PackageX, PaintBucket, Paintbrush, Paintbrush2, Palette, PanelBottom, PanelBottomClose, PanelLeft, PanelLeftClose, PanelRight, PanelRightClose, PanelTop, PanelTopClose, Paperclip, Parachute, Parentheses, ParkingMeter, PartyPopper, Pause, PauseCircle, PauseOctagon, Pen, PenTool, Pencil, Percent, PersonStanding, Phone, PhoneCall, PhoneForwarded, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, PhonePaused, PictureInPicture, PictureInPicture2, PieChart, PiggyBank, Pin, PinOff, Pipette, Plane, PlaneLanding, PlaneTakeoff, Play, PlayCircle, Plug, Plug2, PlugZap, Plus, PlusCircle, PlusSquare, Pocket, Podcast, Pointer, PoundSterling, Power, PowerOff, Printer, Projector, Puzzle, QrCode, Quote, Radio, RadioReceiver, RadioTower, Rat, Receipt, RectangleHorizontal, RectangleVertical, Recycle, Redo, RefreshCcw, RefreshCw, Regex, Refrigerator, RemoveFormatting, Repeat, Repeat1, Repeat2, Replace, ReplaceAll, Reply, ReplyAll, Rewind, Rocket, RockingChair, Rotate3d, RotateCcw, RotateCw, Router, Rows3, Rss, Ruler, RussianRuble, Sailboat, Salad, Sandwich, Satellite, SatelliteDish, Save, SaveAll, Scale, Scale3d, Scaling, Scan, ScanBarcode, ScanEye, ScanFace, ScanLine, ScanSearch, ScanText, Scissors, ScreenShare, ScreenShareOff, Scroll, Search, SearchCheck, SearchCode, SearchMinus, SearchPlus, Send, SeparatorHorizontal, SeparatorVertical, Server, ServerCog, ServerCrash, ServerOff, Settings as SettingsIcon2, Settings2, Share, Share2, Sheet, Shield, ShieldAlert, ShieldCheck, ShieldClose, ShieldOff, ShieldQuestion, Ship, ShoppingBag, ShoppingCart, Shovel, ShowerHead, Shrink, Shuffle, Sidebar, SidebarClose, SidebarOpen, Sigma, Signal, SignalHigh, SignalLow, SignalMedium, SignalZero, Siren, SkipBack, SkipForward, Skull, Slack, Slash, Slice, Sliders, SlidersHorizontal, Smartphone, SmartphoneCharging, SmartphoneNfc, Smile, SmilePlus, Snowflake, Sofa, SortAsc, SortDesc, Speaker, Speech, Square, SquareAsterisk, SquareDot, SquareEqual, SquareKanban, SquareMinus, SquareParking, SquarePen, SquarePlus, SquareStack, SquareTerminal, SquareUser, SquareX, Stack, Star, StarHalf, StarOff, Stars, StepBack, StepForward, Stethoscope, Sticker, StickyNote, StopCircle, Store, StretchHorizontal, StretchVertical, Strikethrough, Subscript, Subtitles, Sun, Sunrise, Sunset, Superscript, SwatchBook, SwissFranc, SwitchCamera, Sword, Swords, Table, Table2, Tablet, Tablets, Tag, Tags, Target, Tent, Terminal, TerminalSquare, TestTube, TestTube2, TestTubes, Text, TextCursor, TextCursorInput, TextSelect, Thermometer, ThermometerSnowflake, ThermometerSun, ThumbsDown, ThumbsUp, Ticket, Timer, TimerOff, TimerReset, ToggleLeft, ToggleRight, Tornado, ToyBrick, Train, Tram, Trash, Trash2, TreeDeciduous, TreePine, Trees, Trello, TrendingDown, TrendingUp, Triangle, TriangleAlert, TriangleRight, Truck, Tv, Twitch, Twitter, Type, TypeIcon, Umbrella, Underline, Undo, Undo2, Ungroup, Unlink, Unlink2, Unlock, Upload, UploadCloud, Usb, User, UserCheck, UserCog, UserMinus, UserPlus, UserX, Users, Utensils, UtensilsCrossed, Variable, Vegan, VenetianMask, Verified, Vibrate, Video, VideoOff, View, Voicemail, Volume, Volume1, Volume2, VolumeX, Vote, Wallet, Wallet2, Wand, Wand2, Warehouse, Watch, Waves, Webcam, Webhook, Weight, Wheat, Wifi, WifiOff, Wind, Wine, WineOff, Workflow, X, XCircle, XOctagon, XSquare, Youtube, Zap, ZapOff, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, TaskSection, TaskPriority } from '@/types/task-management';
import { useTaskManagement } from '@/hooks/useTaskManagement';
import TaskForm from '@/components/tasks/TaskForm';
import SectionForm from '@/components/tasks/SectionForm';
import CategoryForm from '@/components/tasks/CategoryForm';
import TaskItem from '@/components/tasks/TaskItem';

const DailyTasksV3: React.FC = () => {
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
    sections,
    isLoadingSections,
    sectionsError,
    categories,
    isLoadingCategories,
    categoriesError,
    addTask,
    updateTask,
    deleteTask,
    updateTaskOrders,
    addSection,
    updateSection,
    deleteSection,
    updateSectionOrders,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useTaskManagement();

  const handleAddTask = (newTask: Partial<Task>) => {
    addTask(newTask);
    setIsAddTaskDialogOpen(false);
  };

  const handleUpdateTask = (updatedTask: Partial<Task>) => {
    updateTask(updatedTask);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
  };

  const handleAddSection = (newSection: Partial<TaskSection>) => {
    addSection(newSection);
    setIsAddSectionDialogOpen(false);
  };

  const handleUpdateSection = (updatedSection: Partial<TaskSection>) => {
    updateSection(updatedSection);
    setEditingSection(null);
  };

  const handleDeleteSection = (sectionId: string) => {
    deleteSection(sectionId);
  };

  const handleAddCategory = (newCategory: Partial<TaskCategory>) => {
    addCategory(newCategory);
  };

  const handleUpdateCategory = (updatedCategory: Partial<TaskCategory>) => {
    updateCategory(updatedCategory);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (categoryId: string) => {
    deleteCategory(categoryId);
  };

  const filteredSections = useMemo(() => {
    if (!sections) return [];

    return sections
      .map((section) => {
        const filteredTasks = section.tasks
          .filter((task) => {
            const matchesSearch = searchTerm.toLowerCase() === '' || task.description.toLowerCase().includes(searchTerm.toLowerCase());
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
        await updateSectionOrders(updates);
      } else if (type === 'task') {
        const sourceSectionId = source.droppableId;
        const destinationSectionId = destination.droppableId;

        const newSections = JSON.parse(JSON.stringify(sections)); // Deep copy to avoid direct state mutation
        const sourceSection = newSections.find((sec: TaskSection) => sec.id === sourceSectionId);
        const destinationSection = newSections.find((sec: TaskSection) => sec.id === destinationSectionId);

        if (!sourceSection || !destinationSection) return;

        let movedTask: Task;

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
          await updateTaskOrders(taskUpdates);
        }
      }
    },
    [sections, updateSectionOrders, updateTaskOrders]
  );

  if (isLoadingSections || isLoadingCategories) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2Icon className="h-8 w-8 animate-spin text-blue-500" />
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
          <ListTodoIcon className="mr-3 h-8 w-8 text-blue-600" /> Daily Tasks
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
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterPriority} onValueChange={(value: TaskPriority | 'all') => setFilterPriority(value)}>
            <SelectTrigger className="w-[180px]">
              <FilterIcon className="mr-2 h-4 w-4 text-gray-500" />
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
                <PlusIcon className="mr-2 h-4 w-4" /> Add Task
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
                <ListIcon className="mr-2 h-4 w-4" /> Add Section
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
                <SettingsIcon className="mr-2 h-4 w-4" /> Manage Categories
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
                      <PlusIcon className="mr-2 h-4 w-4" /> Add New Category
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
                    <ListTodoIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
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