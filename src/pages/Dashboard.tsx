"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Plus, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

// Import components
import MeditationNotesCard from "@/components/dashboard/MeditationNotes";
import ProjectBalanceTracker from "@/components/dashboard/ProjectBalanceTracker";
import QuickLinks from "@/components/dashboard/QuickLinks";
import WeeklyFocus from "@/components/dashboard/WeeklyFocus";
import CustomCardComponent from "@/components/dashboard/CustomCardComponent";
import DashboardLayoutSettings from "@/components/dashboard/DashboardLayoutSettings";

// Import hooks and types
import { useSettings } from "@/context/SettingsContext";
import { useDashboardData, CustomCard } from "@/hooks/useDashboardData";
import { UserSettings } from "@/types"; // Ensure UserSettings is imported

const Dashboard: React.FC = () => {
  const user = useUser();
  const { settings, loading, updateSettings } = useSettings();
  const { customCards, loadingCustomCards } = useDashboardData();

  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);
  const [panelSizes, setPanelSizes] = useState<number[]>([]);

  useEffect(() => {
    if (settings?.dashboard_panel_sizes) {
      setPanelSizes(settings.dashboard_panel_sizes);
    } else {
      setPanelSizes([66, 34]); // Default sizes
    }
  }, [settings?.dashboard_panel_sizes]);

  const handlePanelGroupChange = async (sizes: number[]) => {
    setPanelSizes(sizes);
    if (settings) {
      await updateSettings({ dashboard_panel_sizes: sizes });
    }
  };

  const availableCoreCards = [
    { id: "meditation-notes", title: "Meditation Notes", component: <MeditationNotesCard /> },
    { id: "project-balance-tracker", title: "Project Balance Tracker", component: <ProjectBalanceTracker /> },
    { id: "quick-links", title: "Quick Links", component: <QuickLinks /> },
    { id: "weekly-focus", title: "Weekly Focus", component: <WeeklyFocus /> },
  ];

  const allAvailableCards = [
    ...availableCoreCards,
    ...(customCards || []).map((card: CustomCard) => ({
      id: card.id,
      title: card.title,
      emoji: card.emoji,
      component: <CustomCardComponent card={card} />,
    })),
  ];

  const getVisibleCards = () => {
    if (!settings?.dashboard_layout || settings.dashboard_layout.length === 0) {
      // If no layout saved, show all core cards and visible custom cards by default
      const defaultVisibleCardIds = availableCoreCards.map(card => card.id);
      const visibleCustomCardIds = (customCards || []).filter(card => card.is_visible).map(card => card.id);
      const initialLayout = [...defaultVisibleCardIds, ...visibleCustomCardIds];
      return initialLayout.map(cardId => allAvailableCards.find(card => card.id === cardId)).filter(Boolean);
    }
    return settings.dashboard_layout
      .map(cardId => allAvailableCards.find(card => card.id === cardId))
      .filter(Boolean);
  };

  const visibleCards = getVisibleCards();

  if (loading || loadingCustomCards) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button variant="outline" onClick={() => setIsLayoutSettingsOpen(true)}>
          <SettingsIcon className="mr-2 h-4 w-4" /> Customize Layout
        </Button>
      </div>

      <ResizablePanelGroup direction="horizontal" onLayout={handlePanelGroupChange} className="flex-grow">
        <ResizablePanel defaultSize={panelSizes[0]} minSize={30}>
          <div className="h-full pr-2 overflow-y-auto">
            <DragDropContext onDragEnd={(result: DropResult) => {
              // Handle reordering of cards within the left panel if needed
              // For now, layout is managed in settings dialog
            }}>
              <Droppable droppableId="dashboard-left-panel">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {visibleCards.filter((_, i) => i % 2 === 0).map((card, index) => (
                      <Draggable key={card!.id} draggableId={card!.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            {card!.component}
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
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={panelSizes[1]} minSize={30}>
          <div className="h-full pl-2 overflow-y-auto">
            <DragDropContext onDragEnd={(result: DropResult) => {
              // Handle reordering of cards within the right panel if needed
              // For now, layout is managed in settings dialog
            }}>
              <Droppable droppableId="dashboard-right-panel">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {visibleCards.filter((_, i) => i % 2 !== 0).map((card, index) => (
                      <Draggable key={card!.id} draggableId={card!.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            {card!.component}
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
        </ResizablePanel>
      </ResizablePanelGroup>

      <DashboardLayoutSettings
        availableCards={allAvailableCards}
      />
    </div>
  );
};

export default Dashboard;