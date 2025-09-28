"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, Settings as SettingsIcon, RefreshCcw, GripVertical, EyeOff, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSettings } from "@/context/SettingsContext";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useTheme } from "@/context/ThemeContext";
import { useDebounce } from "@/hooks/useDebounce";
import { useCommandPalette } from "@/context/CommandPaletteContext";
import { Command as CommandIcon } from "lucide-react";

interface CustomDashboardCard {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  emoji: string | null;
  card_order: number | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

interface DashboardPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const queryClient = useQueryClient();
  const { settings, updateSetting } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const { openCommandPalette } = useCommandPalette();

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardContent, setNewCardContent] = useState("");
  const [newCardEmoji, setNewCardEmoji] = useState("");
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [localDashboardLayout, setLocalDashboardLayout] = useState<number[]>(settings.dashboard_panel_sizes || [33, 33, 34]);

  const debouncedLayout = useDebounce(localDashboardLayout, 500);

  useEffect(() => {
    if (JSON.stringify(debouncedLayout) !== JSON.stringify(settings.dashboard_panel_sizes)) {
      updateSetting("dashboard_panel_sizes", debouncedLayout);
    }
  }, [debouncedLayout, settings.dashboard_panel_sizes, updateSetting]);

  const { data: customCards, isLoading, error, refetch } = useQuery<CustomDashboardCard[], Error>({
    queryKey: ["customDashboardCards", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from("custom_dashboard_cards")
        .select("*")
        .eq("user_id", currentUserId)
        .order("card_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUserId,
  });

  const addCard = async () => {
    if (!currentUserId) {
      toast.error("User not authenticated.");
      return;
    }
    if (!newCardTitle.trim()) {
      toast.error("Card title cannot be empty.");
      return;
    }

    const newOrder = customCards ? customCards.length : 0;

    const { error } = await supabase.from("custom_dashboard_cards").insert({
      user_id: currentUserId,
      title: newCardTitle,
      content: newCardContent,
      emoji: newCardEmoji,
      card_order: newOrder,
      is_visible: true,
    });

    if (error) {
      toast.error("Failed to add card: " + error.message);
    } else {
      toast.success("Card added successfully!");
      setNewCardTitle("");
      setNewCardContent("");
      setNewCardEmoji("");
      setIsAddCardDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["customDashboardCards", currentUserId] });
    }
  };

  const updateCardVisibility = async (cardId: string, isVisible: boolean) => {
    if (!currentUserId) return;
    const { error } = await supabase
      .from("custom_dashboard_cards")
      .update({ is_visible: isVisible })
      .eq("id", cardId)
      .eq("user_id", currentUserId);

    if (error) {
      toast.error("Failed to update card visibility: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["customDashboardCards", currentUserId] });
    }
  };

  const deleteCard = async (cardId: string) => {
    if (!currentUserId) return;
    const { error } = await supabase
      .from("custom_dashboard_cards")
      .delete()
      .eq("id", cardId)
      .eq("user_id", currentUserId);

    if (error) {
      toast.error("Failed to delete card: " + error.message);
    } else {
      toast.success("Card deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["customDashboardCards", currentUserId] });
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !customCards || !currentUserId) return;

    const reorderedCards = Array.from(customCards);
    const [movedCard] = reorderedCards.splice(result.source.index, 1);
    reorderedCards.splice(result.destination.index, 0, movedCard);

    const updates = reorderedCards.map((card, index) => ({
      id: card.id,
      card_order: index,
    }));

    // Optimistic update
    queryClient.setQueryData(["customDashboardCards", currentUserId], reorderedCards);

    const { error } = await supabase.rpc("update_custom_dashboard_cards_order", { updates });

    if (error) {
      toast.error("Failed to reorder cards: " + error.message);
      queryClient.invalidateQueries({ queryKey: ["customDashboardCards", currentUserId] }); // Revert on error
    } else {
      toast.success("Cards reordered successfully!");
      queryClient.invalidateQueries({ queryKey: ["customDashboardCards", currentUserId] });
    }
  };

  const visibleCards = customCards?.filter((card) => card.is_visible) || [];
  // const hiddenCards = customCards?.filter((card) => !card.is_visible) || []; // Removed unused variable

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center">
        <p className="text-destructive">Error loading dashboard cards: {error.message}</p>
        <Button onClick={() => refetch()} className="ml-4">
          <RefreshCcw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <div className="flex space-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={openCommandPalette}>
                <CommandIcon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open Command Palette</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => setIsSettingsDialogOpen(true)}>
                <SettingsIcon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Dashboard Settings</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => setIsAddCardDialogOpen(true)}>
                <Plus className="h-5 w-5 mr-2" /> Add Card
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add a new custom card to your dashboard</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 w-full rounded-lg border overflow-hidden"
        onLayout={(sizes: number[]) => setLocalDashboardLayout(sizes)}
      >
        {visibleCards.length > 0 ? (
          visibleCards.map((card, index) => (
            <React.Fragment key={card.id}>
              <ResizablePanel defaultSize={localDashboardLayout[index] || (100 / visibleCards.length)}>
                <div className="h-full p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold flex items-center">
                      {card.emoji && <span className="mr-2 text-2xl">{card.emoji}</span>}
                      {card.title}
                    </h2>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <GripVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => updateCardVisibility(card.id, false)}>
                          <EyeOff className="h-4 w-4 mr-2" /> Hide Card
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteCard(card.id)} className="text-red-600">
                          <Plus className="h-4 w-4 mr-2 rotate-45" /> Delete Card
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-muted-foreground flex-1">{card.content}</p>
                </div>
              </ResizablePanel>
              {index < visibleCards.length - 1 && <ResizableHandle withHandle />}
            </React.Fragment>
          ))
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            No visible cards. Add a new card or unhide existing ones from settings.
          </div>
        )}
      </ResizablePanelGroup>

      {/* Add Card Dialog */}
      <Dialog open={isAddCardDialogOpen} onOpenChange={setIsAddCardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Dashboard Card</DialogTitle>
            <DialogDescription>
              Create a custom card to display important information or reminders on your dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="emoji" className="text-right">
                Emoji
              </Label>
              <Input
                id="emoji"
                value={newCardEmoji}
                onChange={(e) => setNewCardEmoji(e.target.value)}
                placeholder="e.g., 👋"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="content" className="text-right">
                Content
              </Label>
              <Textarea
                id="content"
                value={newCardContent}
                onChange={(e) => setNewCardContent(e.target.value)}
                className="col-span-3"
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCardDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addCard}>Add Card</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dashboard Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dashboard Settings</DialogTitle>
            <DialogDescription>
              Manage your custom dashboard cards and general dashboard settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme-toggle">Dark Mode</Label>
              <Switch
                id="theme-toggle"
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
              />
            </div>

            <h3 className="text-lg font-semibold">Manage Cards</h3>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="dashboard-cards">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {customCards?.map((card, index) => (
                      <Draggable key={card.id} draggableId={card.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center justify-between p-3 border rounded-md bg-background"
                          >
                            <div className="flex items-center">
                              <span {...provided.dragHandleProps} className="mr-3 cursor-grab">
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                              </span>
                              <span className="font-medium">
                                {card.emoji && <span className="mr-2">{card.emoji}</span>}
                                {card.title}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => updateCardVisibility(card.id, !card.is_visible)}
                                  >
                                    {card.is_visible ? (
                                      <Eye className="h-4 w-4" />
                                    ) : (
                                      <EyeOff className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {card.is_visible ? "Hide Card" : "Show Card"}
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteCard(card.id)}
                                    className="text-red-600"
                                  >
                                    <Plus className="h-4 w-4 rotate-45" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete Card</TooltipContent>
                              </Tooltip>
                            </div>
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
          <DialogFooter>
            <Button onClick={() => setIsSettingsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;