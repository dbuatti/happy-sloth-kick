import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { CustomDashboardCard as CustomCardType, UpdateCustomCardData } from '@/hooks/useCustomDashboardCards';

interface CustomDashboardCardProps {
  card: CustomCardType;
  onUpdate: (cardId: string, updates: UpdateCustomCardData) => Promise<CustomCardType | null>;
  onDelete: (cardId: string) => Promise<boolean>;
}

const CustomDashboardCard: React.FC<CustomDashboardCardProps> = ({ card, onUpdate, onDelete }) => {
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this custom card?')) {
      await onDelete(card.id);
    }
  };

  // Placeholder for edit functionality - you might open a dialog
  const handleEdit = () => {
    console.log('Edit card:', card.id);
    // Implement actual edit dialog/form here
  };

  return (
    <Card className="relative flex flex-col p-6 h-full">
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          {card.emoji && <span className="text-3xl">{card.emoji}</span>}
          {card.title}
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={handleEdit}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-grow text-muted-foreground whitespace-pre-wrap">
        {card.content}
      </CardContent>
    </Card>
  );
};

export default CustomDashboardCard;