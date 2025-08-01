import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Check, Trash2, Archive, Flag, ListRestart } from "lucide-react";
import { cn } from "@/lib/utils"; // Import cn for conditional classes

interface BulkActionsProps {
  selectedTaskIds: string[];
  onAction: (action: string) => void;
  onClearSelection: () => void;
}

const BulkActions: React.FC<BulkActionsProps> = ({ selectedTaskIds, onAction, onClearSelection }) => {
  const isActive = selectedTaskIds.length > 0;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700",
        "py-2 px-3",
        "transition-all duration-300 ease-in-out",
        isActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        isActive ? "h-auto min-h-[56px]" : "h-0 overflow-hidden",
        // New: Fixed positioning when active
        isActive ? "fixed bottom-0 left-0 right-0 z-50" : ""
      )}
    >
      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 sm:mb-0">
        {selectedTaskIds.length} task(s) selected
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8"> {/* Changed h-7 to h-8 */}
              <Flag className="h-4 w-4 mr-2" /> {/* Changed h-3.5 w-3.5 to h-4 w-4 */}
              Priority
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onAction('priority-low')}>
              <div className="w-3 h-3 rounded-full bg-priority-low mr-2"></div>
              Low
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('priority-medium')}>
              <div className="w-3 h-3 rounded-full bg-priority-medium mr-2"></div>
              Medium
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('priority-high')}>
              <div className="w-3 h-3 rounded-full bg-priority-high mr-2"></div>
              High
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('priority-urgent')}>
              <div className="w-3 h-3 rounded-full bg-priority-urgent mr-2"></div>
              Urgent
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" onClick={() => onAction('complete')} className="h-8"> {/* Changed h-7 to h-8 */}
          <Check className="h-4 w-4 mr-2" /> {/* Changed h-3.5 w-3.5 to h-4 w-4 */}
          Complete
        </Button>
        
        <Button variant="outline" size="sm" onClick={() => onAction('archive')} className="h-8"> {/* Changed h-7 to h-8 */}
          <Archive className="h-4 w-4 mr-2" /> {/* Changed h-3.5 w-3.5 to h-4 w-4 */}
          Archive
        </Button>
        
        <Button variant="outline" size="sm" onClick={() => onAction('delete')} className="h-8"> {/* Changed h-7 to h-8 */}
          <Trash2 className="h-4 w-4 mr-2" /> {/* Changed h-3.5 w-3.5 to h-4 w-4 */}
          Delete
        </Button>
        
        <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-8 w-8 p-0"> {/* Changed h-7 w-7 to h-8 w-8 */}
          <ListRestart className="h-4 w-4" /> {/* Changed h-3.5 w-3.5 to h-4 w-4 */}
        </Button>
      </div>
    </div>
  );
};

export default BulkActions;