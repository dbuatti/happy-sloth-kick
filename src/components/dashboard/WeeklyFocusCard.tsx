import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Save, X } from 'lucide-react';
import { useWeeklyFocus } from '@/hooks/useWeeklyFocus';
import { useAuth } from '@/context/AuthContext';
import { format, startOfWeek } from 'date-fns';
import { WeeklyFocusCardProps } from '@/types/props';

const WeeklyFocusCard: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const currentWeekStartDate = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const {
    weeklyFocus,
    isLoading,
    error,
    updateWeeklyFocus,
  } = useWeeklyFocus({ userId, weekStartDate: currentWeekStartDate });

  const [isEditing, setIsEditing] = useState(false);
  const [primaryFocus, setPrimaryFocus] = useState('');
  const [secondaryFocus, setSecondaryFocus] = useState('');
  const [tertiaryFocus, setTertiaryFocus] = useState('');

  useEffect(() => {
    if (weeklyFocus) {
      setPrimaryFocus(weeklyFocus.primary_focus || '');
      setSecondaryFocus(weeklyFocus.secondary_focus || '');
      setTertiaryFocus(weeklyFocus.tertiary_focus || '');
    } else {
      setPrimaryFocus('');
      setSecondaryFocus('');
      setTertiaryFocus('');
    }
  }, [weeklyFocus]);

  const handleSave = async () => {
    if (!userId) return;
    await updateWeeklyFocus({
      week_start_date: currentWeekStartDate,
      primary_focus: primaryFocus,
      secondary_focus: secondaryFocus,
      tertiary_focus: tertiaryFocus,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (weeklyFocus) {
      setPrimaryFocus(weeklyFocus.primary_focus || '');
      setSecondaryFocus(weeklyFocus.secondary_focus || '');
      setTertiaryFocus(weeklyFocus.tertiary_focus || '');
    } else {
      setPrimaryFocus('');
      setSecondaryFocus('');
      setTertiaryFocus('');
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Weekly Focus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Weekly Focus</CardTitle>
        </CardHeader>
        <CardContent className="text-red-500">Error loading weekly focus.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Weekly Focus</CardTitle>
        {isEditing ? (
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" onClick={handleSave}>
              <Save className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <span className="font-semibold">Primary: </span>
          {isEditing ? (
            <Input value={primaryFocus} onChange={(e) => setPrimaryFocus(e.target.value)} />
          ) : (
            <span>{primaryFocus || 'Not set'}</span>
          )}
        </div>
        <div>
          <span className="font-semibold">Secondary: </span>
          {isEditing ? (
            <Input value={secondaryFocus} onChange={(e) => setSecondaryFocus(e.target.value)} />
          ) : (
            <span>{secondaryFocus || 'Not set'}</span>
          )}
        </div>
        <div>
          <span className="font-semibold">Tertiary: </span>
          {isEditing ? (
            <Input value={tertiaryFocus} onChange={(e) => setTertiaryFocus(e.target.value)} />
          ) : (
            <span>{tertiaryFocus || 'Not set'}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyFocusCard;