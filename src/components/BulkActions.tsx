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
        "py-2 px-3", // Adjusted vertical padding from py-3 to py-2
        "transition-all duration-300 ease-in-out",
        isActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        isActive ? "h-auto min-h-[56px]" : "h-0 overflow-hidden", // Adjusted min-h from 60px to 56px
        // New: Fixed positioning when active
        isActive ? "fixed bottom-0 left-0 right-0 z-50" : ""
      )}
    >
      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 sm:mb-0">
        {selectedTaskIds.length} task(s) selected
      </div>
      <div className="flex flex-wrap justify-center gap-1.5"> {/* Changed gap-2 to gap-1.5 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7"> {/* Changed h-8 to h-7 */}
              <Flag className="h-3.5 w-3.5 mr-2" />
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

        <Button variant="outline" size="sm" onClick={() => onAction('complete')} className="h-7"> {/* Changed h-8 to h-7 */}
          <Check className="h-3.5 w-3.5 mr-2" />
          Complete
        </Button>
        
        <Button variant="outline" size="sm" onClick={() => onAction('archive')} className="h-7"> {/* Changed h-8 to h-7 */}
          <Archive className="h-3.5 w-3.5 mr-2" />
          Archive
        </Button>
        
        <Button variant="outline" size="sm" onClick={() => onAction('delete')} className="h-7"> {/* Changed h-8 to h-7 */}
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete
        </Button>
        
        <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-7 w-7 p-0"> {/* Changed h-8 w-8 to h-7 w-7 */}
          <ListRestart className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default BulkActions;