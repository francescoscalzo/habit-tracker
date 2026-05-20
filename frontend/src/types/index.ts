export interface Habit {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
}

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  successRate: number;
  last30days: boolean[];
  last90days: boolean[];
}

export interface CoachMessage {
  role: 'user' | 'assistant';
  content: string;
}
