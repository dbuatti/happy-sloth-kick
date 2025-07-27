import React, { useState, useMemo, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTasks } from '@/hooks/useTasks';
import SortableTaskItem from './SortableTaskItem';
import { Plus, Edit, Trash2, FolderOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import SortableSectionHeader from './SortableSectionHeader';
import BulkActions from './BulkActions';
import DailyStreak from './DailyStreak';
import SmartSuggestions from './SmartSuggestions';
import TaskFilter from './TaskFilter';
import TaskDetailDialog from './TaskDetailDialog';

interface TaskListProps {
  setIsAddTaskOpen: (open: boolean) => void;
}

const TaskList: React.FC<TaskListProps> = ({ setIsAddTaskOpen }) => {
  const {
    filteredTasks,
    loading,
    currentDate,
    setCurrentDate,
    userId,
    handleAddTask,
    updateTask,
    deleteTask,
    selectedTaskIds,
    toggleTaskSelection,
    clearSelectedTasks,
    bulkUpdateTasks,
    sections,
    createSection,
    updateSection,
    deleteSection,
    reorderTasksInSameSection,
    moveTaskToNewSection,
    reorderSections,
  } = useTasks();

  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any>(null);

  const handleAddSection = async () => {
    if (newSectionName.trim()) {
      await createSection(newSectionName.trim());
      setNewSectionName('');
      setIsAddSectionOpen(false);
    }
  };

  const handleRenameSection = async (sectionId: string) => {
    if (editingSectionName.trim()) {
      await updateSection(sectionId, editingSectionName.trim());
      setEditingSectionId(null);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    await deleteSection(sectionId, null);
  };

  const handleEditTask = (task: any) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const sectionGroups = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    filteredTasks.forEach(task => {
      const sectionId = task.section_id || 'no-section';
      if (!grouped[sectionId]) {
        grouped[sectionId] = [];
      }
      grouped[sectionId].push(task);
    });
    return grouped;
  }, [filteredTasks]);

  const handleTaskStatusChange = useCallback(async (taskId: string, newStatus: "to-do" | "completed" | "skipped" | "archived") => {
    await updateTask(taskId, { status: newStatus });
  }, [updateTask]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <main className="flex-grow p-4 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          <DailyStreak tasks={filteredTasks} currentDate={currentDate} />
          <SmartSuggestions />
          <TaskFilter />
          <BulkActions
            selectedTaskIds={selectedTaskIds}
            onAction={(action) => {
              if (action.startsWith('priority-')) {
                const priority = action.split('-')[1];
                bulkUpdateTasks({ priority });
              } else if (action === 'complete') {
                bulkUpdateTasks({ status: 'completed' });
              } else if (action === 'archive') {
                bulkUpdateTasks({ status: 'archived' });
              } else if (action === 'delete') {
                selectedTaskIds.forEach(id => deleteTask(id));
                clearSelectedTasks();
              }
            }}
            onClearSelection={clearSelectedTasks}
          />
          
          {Object.entries(sectionGroups).map(([sectionId, sectionTasks]) => {
            const section = sections.find(s => s.id === sectionId);
            const sectionName = section ? section.name : 'No Section';
            
            return (
              <div key={sectionId} className="space-y-3">
                {sectionId !== 'no-section' ? (
                  <SortableSectionHeader
                    id={sectionId}
                    name={editingSectionId === sectionId ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={editingSectionName}
                          onChange={(e) => setEditingSectionName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRenameSection(sectionId)}
                          autoFocus
                        />
                        <Button size="sm" onClick={() => handleRenameSection(sectionId)} disabled={!editingSectionName.trim()}>Save</Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingSectionId(null)}>Cancel</Button>
                      </div>
                    ) : sectionName}
                    taskCount={sectionTasks.length}
                    isExpanded={true}
                    onToggleExpand={() => {}}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-muted-foreground" />
                      {sectionName} ({sectionTasks.length})
                    </h2>
                  </div>
                )}
                
                <ul className="space-y-2">
                  {sectionTasks.map(task => (
                    <SortableTaskItem
                      key={task.id}
                      task={task}
                      userId={userId}
                      onStatusChange={handleTaskStatusChange}
                      onDelete={deleteTask}
                      onUpdate={updateTask}
                      isSelected={selectedTaskIds.includes(task.id)}
                      onToggleSelect={toggleTaskSelection}
                      sections={sections}
                      onEditTask={handleEditTask}
                    />
                  ))}
                </ul>
              </div>
            );
          })}

          {sections.length === 0 && filteredTasks.length === 0 && (
            <div className="text-center text-gray-500 p-8">
              <p className="text-lg mb-2">No tasks yet!</p>
              <p>Click the button below to add your first task.</p>
            </div>
          )}

          <div className="flex justify-between items-center mt-6">
            <Button onClick={() => setIsAddTaskOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Task
            </Button>
            <div className="flex space-x-2">
              <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <FolderOpen className="mr-2 h-4 w-4" /> Add Section
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Section</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="section-name">Section Name</Label>
                      <Input
                        id="section-name"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        placeholder="e.g., Today, This Week, Backlog"
                        autoFocus
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddSectionOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddSection}>Add Section</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TaskList;