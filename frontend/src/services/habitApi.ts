import { supabase } from '../lib/supabase';
import type { Habit, HabitStats } from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL;
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

async function authHeaders(): Promise<HeadersInit> {
  if (DEV_MODE) {
    return { Authorization: 'Bearer dev', 'Content-Type': 'application/json' };
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' };
}

export async function createHabit(name: string, emoji: string): Promise<Habit> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/habits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, emoji }),
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to create habit');
  return res.json();
}

export async function getHabits(): Promise<Habit[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/habits`, { headers });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to fetch habits');
  return res.json();
}

export async function checkIn(habitId: string): Promise<{ checked: boolean; date: string }> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/habits/${habitId}/check`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (res.status === 409) throw new Error('Already done today');
  if (!res.ok) throw new Error('Check-in failed');
  return res.json();
}

export async function getStats(habitId: string): Promise<HabitStats> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/habits/${habitId}/stats`, { headers });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}
