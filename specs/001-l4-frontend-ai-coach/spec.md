# Feature Specification: L4 Frontend + AI Coach

**Feature Branch**: `001-l4-frontend-ai-coach`
**Created**: 2026-05-20
**Status**: Draft
**Input**: User description: "Estensione L4 per Habit Tracker — React frontend + AI Coach endpoint"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Signup, Login, and Access Dashboard (Priority: P1)

A new user opens the app, creates an account with email and password, and lands
on the habit dashboard. A returning user opens the app and is taken straight to
the dashboard without re-authenticating.

**Why this priority**: Without authentication, no other feature is accessible.
This is the entry gate for all other stories.

**Independent Test**: Visit the app URL, sign up with a test email, verify
redirect to dashboard. Log out, log back in, confirm dashboard loads.

**Acceptance Scenarios**:

1. **Given** no account exists, **When** user fills signup form and submits,
   **Then** account is created and dashboard is displayed.
2. **Given** existing account, **When** user fills login form and submits,
   **Then** dashboard is displayed with habits loaded.
3. **Given** authenticated session, **When** user returns to the app,
   **Then** dashboard loads without prompting for credentials.
4. **Given** invalid credentials, **When** user submits login form,
   **Then** an error message is shown and no navigation occurs.

---

### User Story 2 — View and Check-In on Habits (Priority: P2)

An authenticated user views their habits as cards on the dashboard. Each card
shows the habit name, emoji, and current streak. The user taps "Check-in" on a
card and the streak updates instantly without a full page reload.

**Why this priority**: Core daily interaction. Users open the app primarily to
log check-ins. Requires auth (P1) but no AI features.

**Independent Test**: Create two habits via API, load dashboard, verify cards
appear. Tap check-in on one, verify streak counter increments in-place.

**Acceptance Scenarios**:

1. **Given** authenticated user with habits, **When** dashboard loads,
   **Then** each habit appears as a card with name, emoji, and current streak.
2. **Given** habit card visible, **When** user taps "Check-in",
   **Then** the card streak counter increments and the button is disabled for
   the rest of the day, all without a page reload.
3. **Given** habit already checked in today, **When** dashboard loads,
   **Then** check-in button is shown as disabled/completed.
4. **Given** authenticated user with no habits, **When** dashboard loads,
   **Then** an empty-state prompt is shown encouraging habit creation.

---

### User Story 3 — Habit Detail: Stats and 90-Day Heatmap (Priority: P3)

A user taps a habit card and navigates to the detail page. The page shows
full stats (success rate, longest streak) and a calendar heatmap of the last
90 days with checked-in days highlighted.

**Why this priority**: Motivational insight. Valuable but not blocking daily use.

**Independent Test**: Navigate to detail page for a habit with known check-ins.
Verify stat numbers match expected values. Verify heatmap days match check-in
dates.

**Acceptance Scenarios**:

1. **Given** habit detail page open, **When** page loads,
   **Then** current streak, longest streak, and success rate are displayed.
2. **Given** habit detail page open, **When** page loads,
   **Then** calendar heatmap shows last 90 days with checked-in days visually
   distinct from missed days.
3. **Given** heatmap rendered, **When** user taps a specific day cell,
   **Then** date and check-in status are shown (tooltip or label).

---

### User Story 4 — AI Coach Chat (Priority: P4)

An authenticated user taps a chat icon button on the dashboard to open the AI
Coach as a side drawer overlay. They send a message, the backend loads their
habits as context and streams a coaching response token-by-token. The user sees
text appearing progressively. Tapping outside or a close button dismisses the
drawer.

**Why this priority**: Differentiating feature but depends on all prior stories
for meaningful context. Non-blocking for MVP.

**Independent Test**: Open coach sidebar, type "How am I doing?", verify text
streams visibly in the chat UI. Verify response references at least one real
habit name.

**Acceptance Scenarios**:

1. **Given** coach sidebar open, **When** user sends a message,
   **Then** a loading indicator appears, then text streams token-by-token into
   the chat.
2. **Given** user has habits with check-in data, **When** coach responds,
   **Then** the response is contextually aware of the user's habits (references
   habit names or stats).
3. **Given** stream in progress, **When** stream completes,
   **Then** the send button re-enables and the full message is displayed.
4. **Given** backend error during streaming, **When** stream fails,
   **Then** an error message is shown in the chat and the user can retry.

---

### Edge Cases

- What happens when a user checks in on a habit that was already checked in
  today? → Backend returns 409; frontend shows "already done today" message.
- What happens if the Anthropic API is unavailable? → Backend returns 503;
  frontend shows coach unavailable message; other features unaffected.
- What happens if Supabase auth token expires mid-session? → Frontend detects
  401 from backend, redirects to login, preserving last-visited route.
- What happens on a mobile screen with many habits? → Cards stack vertically,
  heatmap scrolls horizontally.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate users via Supabase email/password auth
  (signup and login).
- **FR-002**: System MUST persist authenticated session across page reloads
  (no re-login on refresh).
- **FR-003**: Dashboard MUST load all habits for the authenticated user from
  the Python backend via REST.
- **FR-004**: Each habit card MUST display: habit name, emoji, current streak.
- **FR-005**: Users MUST be able to perform a check-in from the dashboard card
  without navigating away; the UI MUST update immediately on success.
- **FR-006**: Backend MUST reject duplicate check-ins for the same habit on the
  same calendar day and return a clear error.
- **FR-007**: Habit detail page MUST display: current streak, longest streak,
  success rate, and a 90-day calendar heatmap.
- **FR-008**: Backend MUST expose `POST /coach/chat` accepting a list of
  messages and returning a streaming response. The `user_id` MUST be extracted
  from the validated JWT token server-side; it MUST NOT be accepted from the
  request body.
- **FR-009**: Backend MUST load the authenticated user's habits from Redis and
  include them as context in every AI Coach request.
- **FR-010**: The Anthropic API key MUST be stored as a server-side environment
  variable only; it MUST NOT appear in any client-side code or bundle.
- **FR-011**: CORS MUST be restricted to the deployed frontend domain in
  production; wide-open only in local dev.
- **FR-012**: Frontend MUST display the AI Coach streaming response
  token-by-token as it arrives (not buffered until completion).

### Key Entities

- **User**: Identified by Supabase user ID; owns zero or more habits.
- **Habit**: name, emoji, habitId, createdAt. Stored in Python backend.
- **CheckIn**: presence-only record tied to habitId + date. No content.
- **HabitStats**: currentStreak, longestStreak, successRate, last30days array
  (computed on read by backend, not stored).
- **CoachMessage**: role (`user` | `assistant`), content string. Ephemeral
  per browser session; not persisted in backend. Frontend accumulates history
  in state and sends full array with every request.
- **CoachRequest**: `{ messages: [{role, content}] }`. No `user_id` in body —
  backend extracts identity from the Authorization JWT header only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user completes signup and reaches the dashboard in under
  60 seconds.
- **SC-002**: Dashboard habits load and are visible within 2 seconds on a
  standard mobile connection.
- **SC-003**: Check-in tap registers and the UI reflects the updated streak
  within 1 second, without a full page reload.
- **SC-004**: 90-day heatmap renders correctly for habits with at least 30
  check-ins.
- **SC-005**: AI Coach first token appears within 3 seconds of sending a
  message (excluding network latency outside the lab).
- **SC-006**: API key is not present in any browser-inspectable network
  response, page source, or JavaScript bundle.
- **SC-007**: App is usable on a 375 px wide mobile screen without horizontal
  scrolling (except heatmap, which may scroll independently).

## Assumptions

- Users have a modern browser (Chrome/Safari/Firefox within last 2 years).
- Lab environment: frontend and backend run on localhost; CORS is wide-open in
  dev, restricted for any deployment.
- Supabase project is pre-provisioned for the course; students use provided
  project URL and anon key.
- Habit creation and deletion remain backend-only operations in L4 (no frontend
  UI for them unless explicitly added later).
- `userId` in backend switches from hardcoded `"default"` (L3) to the
  Supabase `user.id` JWT sub claim in L4. Backend validates the JWT on every
  request using `supabase-py` SDK; Redis keys migrate from
  `habits:default:{id}` to `habits:{userId}:{id}`.
- AI Coach chat history is ephemeral per browser session. Frontend holds the
  message array in state and sends it with every request. No Redis storage.
  Persistence across sessions is a L5 exercise.
- Calendar heatmap data comes from extending the existing
  `GET /habits/{id}/stats` response to include a `last90days[0..89]` array
  (same indexing convention: `[0]` = today). No new endpoint needed.

## Clarifications

### Session 2026-05-20

- Q: Should `user_id` come from request body or JWT? → A: Extracted from validated JWT only; removed from CoachRequest body.
- Q: How does AI Coach sidebar open? → A: Toggle button (chat icon) opens/closes as side drawer overlay.
- Q: JWT validation strategy on backend? → A: Use `supabase-py` SDK to verify tokens server-side.

## Decisions

Previously open questions — resolved 2026-05-20:

1. **userId scheme**: Backend switches to real Supabase `user.id` in L4.
   JWT validation added as backend middleware. Redis keys migrate accordingly.
2. **Chat history**: Ephemeral per session. Frontend manages state; backend
   is stateless. Persistence deferred to L5.
3. **Heatmap data source**: Extend existing stats endpoint with
   `last90days[0..89]`. No new endpoint.
