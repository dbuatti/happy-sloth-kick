import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PrioritySelectorProps {
  value: string;
  onChange: (priority: string) => void;
}

const PrioritySelector: React.FC<PrioritySelectorProps> = ({ value, onChange }) => {
  const priorities = [
    { value: 'low', label: 'Low', color: 'text-priority-low' },
    { value: 'medium', label: 'Medium', color: 'text-priority-medium' },
    { value: 'high', label: 'High', color: 'text-priority-high' },
    { value: 'urgent', label: 'Urgent', color: 'text-priority-urgent' },
  ];

  const selectedPriority = priorities.find(p => p.value === value);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Priority</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={`w-full ${selectedPriority?.color}`}>
          <SelectValue placeholder="Select priority" />
        </SelectTrigger>
        <SelectContent>
          {priorities.map((priority) => (
            <SelectItem key={priority.value} value={priority.value} className={priority.color}>
              {priority.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default PrioritySelector;