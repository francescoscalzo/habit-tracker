import { supabase } from '../lib/supabase';
import type { CoachMessage } from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL;
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

async function getToken(): Promise<string> {
  if (DEV_MODE) return 'dev';
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Not authenticated');
  return data.session.access_token;
}

export async function streamCoachMessage(
  messages: CoachMessage[],
  onToken: (token: string) => void,
  onDone: () => void
): Promise<void> {
  const token = await getToken();

  const res = await fetch(`${BASE}/coach/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) throw new Error('Coach unavailable');

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6);
        if (payload === '[DONE]') {
          onDone();
          return;
        }
        onToken(payload);
      }
    }
  }

  onDone();
}
