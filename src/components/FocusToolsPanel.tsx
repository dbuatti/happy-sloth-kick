import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Play, Pause, SkipForward, Check, Edit, Plus, Link } from 'lucide-react';
import { Task, TaskSection, TaskCategory } from '@/types/task';
import { FocusToolsPanelProps } from '@/types/props';

const FocusToolsPanel: React.FC<FocusToolsPanelProps> = ({
  currentTask,
  onCompleteTask,
  onSkipTask,
  onOpenTaskDetail,
  onAddSubtask,
  newSubtaskDescription,
  setNewSubtaskDescription,
  subtasks,
  allTasks,
  sections,
  categories,
  onUpdateTask,
  onDeleteTask,
  onOpenTaskOverview,
  onReorderTasks,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  createCategory,
  updateCategory,
  deleteCategory,
}) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Focus Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentTask && (
          <>
            <div className="flex space-x-2">
              <Button onClick={onCompleteTask} className="flex-1">
                <Check className="mr-2 h-4 w-4" /> Complete Task
              </Button>
              <Button variant="secondary" onClick={onSkipTask} className="flex-1">
                <SkipForward className="mr-2 h-4 w-4" /> Skip Task
              </Button>
            </div>
            <Button variant="outline" className="w-full" onClick={() => onOpenTaskDetail(currentTask)}>
              <Edit className="mr-2 h-4 w-4" /> Edit Task Details
            </Button>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Subtasks</h3>
              <div className="flex space-x-2">
                <Input
                  placeholder="Add a subtask..."
                  value={newSubtaskDescription}
                  onChange={(e) => setNewSubtaskDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onAddSubtask();
                    }
                  }}
                />
                <Button onClick={onAddSubtask} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {subtasks.length === 0 ? (
                  <p className="text-gray-500 text-sm">No subtasks yet.</p>
                ) : (
                  subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center justify-between p-2 border rounded-md text-sm">
                      <span>{subtask.description}</span>
                      <Button variant="ghost" size="icon" onClick={() => onOpenTaskDetail(subtask)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {currentTask.notes && (
              <div>
                <h3 className="font-semibold">Notes:</h3>
                <Textarea readOnly value={currentTask.notes} className="min-h-[100px]" />
              </div>
            )}

            {currentTask.link && (
              <div>
                <h3 className="font-semibold">Link:</h3>
                <a href={currentTask.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center">
                  <Link className="h-4 w-4 mr-1" /> {currentTask.link}
                </a>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FocusToolsPanel;