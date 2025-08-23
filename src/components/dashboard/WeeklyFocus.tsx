import React, { useState, useEffect } from 'react';
import { WeeklyFocus, useDashboardData } from '@/hooks/useDashboardData';
import EditableCard from './EditableCard';
import { Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface WeeklyFocusCardProps {
  weeklyFocus: WeeklyFocus | null;
  updateWeeklyFocus: ReturnType<typeof useDashboardData>['updateWeeklyFocus'];
  loading: boolean;
}

const WeeklyFocusCard: React.FC<WeeklyFocusCardProps> = ({ weeklyFocus, updateWeeklyFocus, loading }) => {
  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState('');
  const [tertiary, setTertiary] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (weeklyFocus) {
      setPrimary(weeklyFocus.primary_focus || '');
      setSecondary(weeklyFocus.secondary_focus || '');
      setTertiary(weeklyFocus.tertiary_focus || '');
    }
  }, [weeklyFocus]);

  const handleSave = async () => {
    setIsSaving(true);
    await updateWeeklyFocus({
      primary_focus: primary,
      secondary_focus: secondary,
      tertiary_focus: tertiary,
    });
    setIsSaving(false);
  };

  if (loading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const renderEditForm = () => (
    <div className="space-y-2">
      <div>
        <Label>Primary Focus</Label>
        <Input value={primary} onChange={(e) => setPrimary(e.target.value)} placeholder="e.g., Launch new feature" />
      </div>
      <div>
        <Label>Secondary Focus</Label>
        <Input value={secondary} onChange={(e) => setSecondary(e.target.value)} placeholder="e.g., Plan Q3 roadmap" />
      </div>
      <div>
        <Label>Tertiary Focus</Label>
        <Input value={tertiary} onChange={(e) => setTertiary(e.target.value)} placeholder="e.g., Exercise 3 times" />
      </div>
    </div>
  );

  return (
    <EditableCard title="This Week's Focus" icon={Target} onSave={handleSave} renderEditForm={renderEditForm} isSaving={isSaving}>
      <ul className="space-y-3 text-sm">
        <li className="flex items-start gap-3">
          <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">1</div>
          <span className="text-muted-foreground mt-0.5 break-words">{weeklyFocus?.primary_focus || 'Not set'}</span>
        </li>
        <li className="flex items-start gap-3">
          <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">2</div>
          <span className="text-muted-foreground mt-0.5 break-words">{weeklyFocus?.secondary_focus || 'Not set'}</span>
        </li>
        <li className="flex items-start gap-3">
          <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">3</div>
          <span className="text-muted-foreground mt-0.5 break-words">{weeklyFocus?.tertiary_focus || 'Not set'}</span>
        </li>
      </ul>
    </EditableCard>
  );
};

export default WeeklyFocusCard;