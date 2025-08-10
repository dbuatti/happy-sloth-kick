import React, { useState } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { LayoutDashboard, Plus } from 'lucide-react';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import SupportLinkCard from '@/components/dashboard/SupportLink';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import CustomCard from '@/components/dashboard/CustomCard';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { customCards, addCustomCard } = useDashboardData({ userId: demoUserId });
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardContent, setNewCardContent] = useState('');
  const [newCardEmoji, setNewCardEmoji] = useState('');

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    await addCustomCard({
      title: newCardTitle,
      content: newCardContent,
      emoji: newCardEmoji,
      card_order: customCards.length,
    });
    setNewCardTitle('');
    setNewCardContent('');
    setNewCardEmoji('');
    setIsAddCardOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            My Dashboard
          </h1>
          <Button onClick={() => setIsAddCardOpen(true)} disabled={isDemo}>
            <Plus className="mr-2 h-4 w-4" /> Add Card
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DailySchedulePreview />
          </div>

          <div className="lg:col-span-1 space-y-6">
            <WeeklyFocusCard />
            <SupportLinkCard />
            <MeditationNotesCard />
            {customCards.map(card => (
              <CustomCard key={card.id} card={card} />
            ))}
          </div>
        </div>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>

      <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title</Label>
              <Input value={newCardTitle} onChange={(e) => setNewCardTitle(e.target.value)} placeholder="e.g., Things to Remember" />
            </div>
            <div>
              <Label>Emoji (Optional)</Label>
              <Input value={newCardEmoji} onChange={(e) => setNewCardEmoji(e.target.value)} placeholder="🍊" maxLength={2} />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea value={newCardContent} onChange={(e) => setNewCardContent(e.target.value)} placeholder="e.g., You have an orange" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCardOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCard}>Add Card</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;