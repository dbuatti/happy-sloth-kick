import { showError } from '@/utils/toast';

export async function getHabitChallengeSuggestion(userId: string, habitId: string): Promise<string | null> {
  try {
    const response = await fetch('https://gdmjttmjjhadltaihpgr.supabase.co/functions/v1/suggest-habit-challenge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, habitId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch habit challenge suggestion.');
    }

    const data = await response.json();
    return data.suggestion;
  } catch (error: any) {
    console.error('Error fetching habit challenge suggestion:', error);
    showError(error.message || 'Failed to get habit challenge suggestion.');
    return null;
  }
}