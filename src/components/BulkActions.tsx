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
        "flex items-center justify-between bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700",
        "h-[70px] px-4", // Fixed height and horizontal padding
        "transition-all duration-300 ease-in-out",
        isActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="text-sm text-gray-600 dark:text-gray-300">
        {selectedTaskIds.length} task(s) selected
      </div>
      <div className="flex space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Flag className="h-4 w-4 mr-2" />
              Priority
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onAction('priority-low')}>
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
              Low
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('priority-medium')}>
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
              Medium
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('priority-high')}>
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
              High
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('priority-urgent')}>
              <div className="w-3 h-3 rounded-full bg-red-700 mr-2"></div>
              Urgent
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" onClick={() => onAction('complete')}>
          <Check className="h-4 w-4 mr-2" />
          Complete
        </Button>
        
        <Button variant="outline" size="sm" onClick={() => onAction('archive')}>
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </Button>
        
        <Button variant="outline" size="sm" onClick={() => onAction('delete')}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
        
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <ListRestart className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default BulkActions;