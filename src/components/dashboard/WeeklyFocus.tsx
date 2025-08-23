import React, { useState, useEffect } from 'react';
import { WeeklyFocus, UpdateWeeklyFocusData, WeeklyFocusCardProps } from '@/types';
import EditableCard from './EditableCard';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const WeeklyFocus: React.FC<WeeklyFocusCardProps> = ({
  weeklyFocus,
  updateWeeklyFocus,
  primaryFocus: initialPrimaryFocus,
  secondaryFocus: initialSecondaryFocus,
  tertiaryFocus: initialTertiaryFocus,
}) => {
  const [primaryFocus, setLocalPrimaryFocus] = useState(initialPrimaryFocus);
  const [secondaryFocus, setLocalSecondaryFocus] = useState(initialSecondaryFocus);
  const [tertiaryFocus, setLocalTertiaryFocus] = useState(initialTertiaryFocus);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalPrimaryFocus(initialPrimaryFocus);
    setLocalSecondaryFocus(initialSecondaryFocus);
    setLocalTertiaryFocus(initialTertiaryFocus);
  }, [initialPrimaryFocus, initialSecondaryFocus, initialTertiaryFocus]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateWeeklyFocus({
        primary_focus: primaryFocus,
        secondary_focus: secondaryFocus,
        tertiary_focus: tertiaryFocus,
      });
      toast.success('Weekly focus updated!');
    } catch (error) {
      toast.error('Failed to update weekly focus.');
      console.error('Error updating weekly focus:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Weekly Focus</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <EditableCard
          title="Primary Focus"
          content={primaryFocus}
          onContentChange={setLocalPrimaryFocus}
          onSave={handleSave}
          isSaving={isSaving}
          placeholder="What's your main goal this week?"
        />
        <EditableCard
          title="Secondary Focus"
          content={secondaryFocus}
          onContentChange={setLocalSecondaryFocus}
          onSave={handleSave}
          isSaving={isSaving}
          placeholder="What else is important?"
        />
        <EditableCard
          title="Tertiary Focus"
          content={tertiaryFocus}
          onContentChange={setLocalTertiaryFocus}
          onSave={handleSave}
          isSaving={isSaving}
          placeholder="Any other minor goals?"
        />
      </CardContent>
    </Card>
  );
};

export default WeeklyFocus;