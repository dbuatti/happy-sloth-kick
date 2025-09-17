import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import { X } from 'lucide-react';

// Curated list of Lucide icons suitable for habits
const curatedIcons = [
  'Apple', 'BookOpen', 'Dumbbell', 'Droplet', 'Leaf', 'Moon', 'Run', 'Bike', 'Meditation', 'NotebookPen', 'Code', 'Coffee', 'Sun', 'Cloud', 'Heart', 'Star', 'Target', 'Flame', 'Walk', 'Yoga', 'Armchair', 'MessageSquare', 'UtensilsCrossed', 'TreePine', 'ScanEye', 'GlassWater', 'Footprints', 'GraduationCap', 'Languages', 'Salad', 'YinYang', 'Stretch', 'Laptop', 'Feather', 'Library', 'Scroll', 'Sparkles', 'AlarmClock', 'Bed', 'Briefcase', 'Camera', 'Car', 'ChefHat', 'CircleDollarSign', 'ClipboardList', 'CookingPot', 'CreditCard', 'Crown', 'CupSoda', 'Dices', 'Dog', 'Gamepad', 'Gift', 'Globe', 'GraduationCap', 'Hammer', 'Handshake', 'Headphones', 'Home', 'Lightbulb', 'Map', 'Mic', 'Music', 'Palette', 'PawPrint', 'PenTool', 'Phone', 'Pizza', 'Plane', 'Plug', 'Popcorn', 'Puzzle', 'Rocket', 'Sailboat', 'Scissors', 'ShoppingCart', 'ShowerHead', 'Smile', 'Snowflake', 'Speech', 'Sprout', 'SquareStack', 'Sticker', 'Sword', 'Tablet', 'Tent', 'TestTube', 'Thermometer', 'ThumbsUp', 'Tractor', 'Train', 'Trophy', 'Tv', 'Umbrella', 'Vegan', 'Volume2', 'Wallet', 'Watch', 'Weight', 'Wheat', 'Wine', 'Zap', 'ZoomIn', 'ZoomOut'
];

interface IconPickerProps {
  value: string | null;
  onChange: (iconName: string) => void;
  disabled?: boolean;
}

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredIcons = useMemo(() => {
    const lowerCaseSearch = search.toLowerCase();
    return curatedIcons.filter(iconName =>
      iconName.toLowerCase().includes(lowerCaseSearch)
    ).sort((a, b) => {
      // Prioritize exact matches or starts-with matches
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      if (aLower === lowerCaseSearch) return -1;
      if (bLower === lowerCaseSearch) return 1;
      if (aLower.startsWith(lowerCaseSearch) && !bLower.startsWith(lowerCaseSearch)) return -1;
      if (bLower.startsWith(lowerCaseSearch) && !aLower.startsWith(lowerCaseSearch)) return 1;
      return a.localeCompare(b);
    });
  }, [search]);

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setSearch('');
  };

  const DisplayIcon = value ? (LucideIcons as any)[value] : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 text-base"
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            {DisplayIcon && <DisplayIcon className="h-4 w-4" />}
            {value || "Select icon"}
          </div>
          {value && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={handleClear}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput
            placeholder="Search icons..."
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>No icons found.</CommandEmpty>
            <CommandGroup>
              <div className="grid grid-cols-5 gap-1 p-2 max-h-60 overflow-y-auto">
                {filteredIcons.map((iconName) => {
                  const IconComponent = (LucideIcons as any)[iconName];
                  return (
                    <Button
                      key={iconName}
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-9 w-9",
                        value === iconName && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => handleSelect(iconName)}
                      title={iconName}
                    >
                      <IconComponent className="h-5 w-5" />
                    </Button>
                  );
                })}
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default IconPicker;