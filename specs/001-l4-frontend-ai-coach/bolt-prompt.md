# Bolt.new Prompt — Habit Tracker Frontend (L4)

> Paste this entire file as the Bolt.new project prompt.

---

## What to build

A mobile-first habit tracker single-page app. Users log in via Supabase, view
their habits on a dashboard, check in daily, see a 90-day calendar heatmap on
the detail page, and chat with an AI coach in a side drawer.

**All data (habits, stats, check-ins) lives in a separate Python backend
accessible via REST. Do NOT use Supabase for habit data — only for auth.**

---

## Tech stack

- **Vite + React 18 + TypeScript** (Bolt default — do not use Next.js)
- **@supabase/supabase-js** for auth only
- **Tailwind CSS** for styling
- **React Router v6** for routing
- **Dark mode by default** (Tailwind `dark` class on `<html>`)
- **No Redux** — React `useState` / `useContext` is enough

---

## Environment variables

Read from `.env.local`. Never hardcode these values.

```
VITE_SUPABASE_URL=<supabase project url>
VITE_SUPABASE_ANON_KEY=<supabase anon key>
VITE_API_BASE_URL=http://localhost:8000
```

**IMPORTANT**: Do NOT add any `ANTHROPIC_API_KEY` or backend secret here.
The AI coach is called via the Python backend, not directly from the frontend.

---

## Authentication

Use `@supabase/supabase-js`. Initialize one shared client in `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

- **Signup**: `supabase.auth.signUp({ email, password })`
- **Login**: `supabase.auth.signInWithPassword({ email, password })`
- **Logout**: `supabase.auth.signOut()`
- **Session restore**: `supabase.auth.getSession()` on app load — if session
  exists, redirect to dashboard without prompting login
- **JWT for API calls**: `session.access_token` — send as
  `Authorization: Bearer <token>` header on every backend request
- **Token expiry**: if any backend call returns 401, redirect to `/login`
  and preserve the previous route in state

---

## Routes

| Route | Component | Auth required |
|-------|-----------|---------------|
| `/login` | `LoginPage` | No |
| `/` | `DashboardPage` | Yes |
| `/habits/:id` | `HabitDetailPage` | Yes |

Unauthenticated users visiting a protected route → redirect to `/login`.
Authenticated users visiting `/login` → redirect to `/`.

---

## API service layer

Create `src/services/habitApi.ts` and `src/services/coachApi.ts`.
All calls go to `VITE_API_BASE_URL`. All calls include the auth header.

### habitApi.ts

```typescript
const BASE = import.meta.env.VITE_API_BASE_URL

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${data.session!.access_token}` }
}

export async function getHabits(): Promise<Habit[]>
// GET /habits

export async function checkIn(habitId: string): Promise<{ checked: boolean; date: string }>
// POST /habits/:habitId/check   body: {}

export async function getStats(habitId: string): Promise<HabitStats>
// GET /habits/:habitId/stats
```

### coachApi.ts

```typescript
export async function streamCoachMessage(
  messages: CoachMessage[],
  onToken: (token: string) => void,
  onDone: () => void
): Promise<void>
// POST /coach/chat  body: { messages }
// Reads SSE stream: each line "data: <text>" → call onToken(text)
// "data: [DONE]" → call onDone()
```

Use `fetch` with `ReadableStream` to consume the SSE response.
Do NOT use `EventSource` (it does not support POST with auth headers).

---

## TypeScript types

```typescript
interface Habit {
  id: string
  name: string
  emoji: string
  createdAt: string
}

interface HabitStats {
  currentStreak: number
  longestStreak: number
  successRate: number       // 0–1
  last30days: boolean[]     // [0] = today, length 30
  last90days: boolean[]     // [0] = today, length 90
}

interface CoachMessage {
  role: 'user' | 'assistant'
  content: string
}
```

---

## Pages and components

### LoginPage (`/login`)

- Two forms: **Sign Up** and **Log In** (toggle with a tab or link)
- Fields: email, password
- On submit: call Supabase auth, redirect to `/` on success
- Show inline error message on failure (e.g., "Invalid credentials")
- Loading state on the submit button

---

### DashboardPage (`/`)

Layout:
- Header with app title "Habit Tracker" and a logout icon button
- Grid/list of `HabitCard` components (one per habit)
- Empty state when no habits: "No habits yet. Add some via the API."
- Floating action button (bottom-right): chat icon (💬) opens `CoachDrawer`

Data: call `getHabits()` on mount. Show loading skeleton while fetching.

---

### HabitCard component

Props: `habit: Habit`, `stats: HabitStats` (fetch stats per card on mount)

Display:
- Emoji (large) + habit name
- Current streak: "🔥 5 days"
- **Check-in button**: primary color, text "Check in ✓"
  - If already checked in today (`last30days[0] === true`): button disabled,
    text "Done today ✓", muted color
  - On tap: call `checkIn(habit.id)`; optimistically update button state;
    on 409 response show "Already done today"
  - On tap: update streak display immediately (increment by 1) without reload
- Tap on card body (not button) → navigate to `/habits/:id`

---

### HabitDetailPage (`/habits/:id`)

Data: `getStats(id)` on mount.

Display:
- Back button → `/`
- Habit emoji + name (large)
- Stats row: Current streak · Longest streak · Success rate (as %)
- `HabitHeatmap` component below stats

---

### HabitHeatmap component

Props: `last90days: boolean[]`

Render a 90-cell calendar grid (13 weeks × 7 days, left to right = oldest to
newest):
- `last90days[0]` = today (rightmost cell)
- `last90days[89]` = 90 days ago (leftmost cell)
- Checked day: filled cell (green or accent color)
- Missed day: empty/dim cell
- Tap on a cell: show tooltip with date and status
- Grid scrolls horizontally on mobile (do not break layout)
- Show month labels above the grid

---

### CoachDrawer component

Trigger: chat icon button on DashboardPage.

Behavior:
- Opens as a **right-side drawer overlay** (slides in, backdrop behind)
- Close: tap backdrop or ✕ button inside drawer
- Full height on mobile, fixed width (~380px) on desktop

Chat UI inside drawer:
- Message list (scrollable): user messages right-aligned, assistant messages
  left-aligned with a bot avatar/icon
- Input field + Send button at the bottom
- On send:
  1. Append user message to list immediately
  2. Append empty assistant message placeholder with a loading indicator
  3. Call `streamCoachMessage(messages, onToken, onDone)`:
     - `onToken`: append token to the last assistant message (update in place)
     - `onDone`: remove loading indicator, re-enable Send button
  4. Disable Send button while streaming
- On backend error (non-200): show "Coach unavailable. Try again." in chat
- Conversation history accumulates in component state (ephemeral — lost on close)

---

## UI / UX requirements

- **Dark mode default**: background `#0f0f0f` or Tailwind `zinc-950`, text white
- **Mobile responsive**: tested at 375px width (iPhone SE)
- **No horizontal scroll** at page level (heatmap may scroll internally)
- **No page reload** for check-ins — optimistic UI update only
- **Loading states**: skeleton cards on dashboard load, spinner on check-in button
- **Accessible**: buttons have `aria-label`, color is not the only indicator

---

## Acceptance criteria (validate before considering done)

- [ ] New user: signup → dashboard in < 60 seconds
- [ ] Returning user: page refresh → dashboard loads without login prompt
- [ ] Dashboard shows all habits as cards with name, emoji, streak
- [ ] Check-in button tap updates streak in-place without reload
- [ ] Check-in button disabled after checking in today
- [ ] Habit detail shows currentStreak, longestStreak, successRate
- [ ] Heatmap renders 90 days; today is rightmost cell
- [ ] Coach drawer opens via chat icon; closes via backdrop or ✕
- [ ] Sending a message streams AI response token-by-token (visible typing)
- [ ] No `ANTHROPIC_API_KEY` in `.env.local`, source code, or network requests
- [ ] App usable at 375px width without horizontal scrolling
