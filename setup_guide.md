# ❄️ Winter Arc — 90-Day Discipline & Habit Tracker

> A production-ready, dark-aesthetic 90-Day Discipline & Habit Tracker built with **React 18**, **TypeScript**, **Vite**, **Supabase**, and **Tailwind / Scoped CSS**.

---

## ⚡ Quick Start

### 1. Install & Run Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit **`http://localhost:5173/`** in your browser.

---

## 🔐 Environment & Live Supabase Credentials

The application is pre-configured in `.env`:

```env
VITE_SUPABASE_URL=https://ovxjtlrikkzigepaushk.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_fnE0BLU3VjsaQCUEydDMcg_eiIQh6eH
```

Supabase client is initialized in [`src/lib/supabase.ts`](file:///e:/gggg/src/lib/supabase.ts) via `createClient(supabaseUrl, supabaseAnonKey)`.

---

## 🗄️ Database Schema & Auto-Seed SQL Migration

To set up or refresh your database schema in Supabase, navigate to **Dashboard > SQL Editor** and execute the migration script located at [`supabase/migrations/001_initial_schema.sql`](file:///e:/gggg/supabase/migrations/001_initial_schema.sql):

```sql
-- ── Profiles ──
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text,
  start_date      date not null default current_date,
  duration_days   int  not null default 90,
  threshold       int  not null default 80,
  privacy_mode    boolean not null default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── Habits ──
create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('check', 'number')),
  target      numeric,
  unit        text,
  color       text,
  position    int  not null default 1,
  archived    boolean not null default false,
  created_at  timestamptz default now()
);

-- ── Logs ──
create table if not exists public.logs (
  id          uuid primary key default gen_random_uuid(),
  habit_id    uuid not null references public.habits(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  status      text check (status in ('done', 'missed')),
  value       numeric,
  notes       text,
  created_at  timestamptz default now(),
  unique (habit_id, date)
);

-- ── Enable RLS ──
alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.logs enable row level security;

-- ── Trigger on auth.users for Auto-Creating Profile & Seeding 16 Core Habits ──
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_display_name text;
begin
  user_display_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, display_name, start_date, duration_days, threshold, privacy_mode)
  values (new.id, user_display_name, current_date, 90, 80, false)
  on conflict (id) do update set
    display_name = coalesce(public.profiles.display_name, excluded.display_name);

  insert into public.habits (user_id, name, type, target, unit, color, position, archived)
  values
    (new.id, 'No porn',           'check',  null,  null,    'shield', 1,  false),
    (new.id, 'Drink water',       'number', 3,     'L',     'drop',   2,  false),
    (new.id, 'Sleep',             'number', 8,     'hrs',   'moon',   3,  false),
    (new.id, 'Max out protein',   'check',  null,  null,    'dumb',   4,  false),
    (new.id, 'Read',              'number', 10,    'pages', 'book',   5,  false),
    (new.id, 'Cold shower',       'check',  null,  null,    'snow',   6,  false),
    (new.id, '10k steps',         'number', 10000, 'steps', 'walk',   7,  false),
    (new.id, 'No sex / PMO',      'check',  null,  null,    'shield', 8,  false),
    (new.id, 'No sugar',          'check',  null,  null,    'ban',    9,  false),
    (new.id, 'No alcohol',        'check',  null,  null,    'ban',    10, false),
    (new.id, 'No distractions',   'check',  null,  null,    'ban',    11, false),
    (new.id, 'Wake up by 6 AM',   'check',  null,  null,    'sun',    12, false),
    (new.id, 'Sleep by 10 PM',    'check',  null,  null,    'moon',   13, false),
    (new.id, 'Focus on yourself', 'check',  null,  null,    'target', 14, false),
    (new.id, 'No excuses',        'check',  null,  null,    'flag',   15, false),
    (new.id, 'Meditate',          'check',  null,  null,    'heart',  16, false);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

## 🎨 Design System & Visual Highlights

- **Dark Midnight Aesthetic**:
  - `--bg: #050F1A;`
  - Radial glow: `radial-gradient(1100px 520px at 88% -8%, rgba(58,166,242,.14), transparent 70%)`
  - Card Surfaces: `--card: #0D1D2F; --card2: #132739; border: 1px solid rgba(232,241,249,0.08);`
  - Accents: Ice Cyan (`#5CC3FF`), Done Teal (`#19C7AE`), Ember Orange (`#FF6B3D`), Missed Rose (`#E5484D`).
- **Typography**:
  - Headings & Dials: Google Font `'Bricolage Grotesque'` bold 700/800 with tabular numbers.
  - Body & Labels: Google Font `'Instrument Sans'` (12.5px minimum font size).
- **Ambient Snow Canvas**: 35 subtle slow floating particles with pause-on-tab-hidden optimization.
- **Desktop 2-Panel Shell (100dvh)**:
  - Left Panel: Circular 90-tick SVG ring (radiating from radius 168 to 190), tick states (Done Teal, Ember Orange, Dimmed future, Elongated bright white active day), giant "Day 28 of 90" indicator, 3-stat cards (Streak with flickering flame `🔥`, Best, Average `58%`), Sample data toggle, and Sun/Moon theme toggle.
  - Main Area: Dynamic time-based greeting, bold white date subtitle with rotating discipline quotes, 3-tab pill with animated sliding gradient indicator, discrete circular gear icon button for settings, and 14-day date strip with active day bright white card and 4px teal completion bar.

---

## 🔊 Web Audio API Synthesizer (Zero External Audio Files)

Implemented in [`src/lib/soundEffects.ts`](file:///e:/gggg/src/lib/soundEffects.ts):
- **Habit Check**: Crisp glass chime (D5 587Hz to A5 880Hz) + particle burst + teal gradient fill.
- **Habit Miss**: Soft low tone (320Hz to 220Hz) + tile shake animation.
- **Stepper `-`/`+`**: Tactile micro-click (660Hz / 440Hz).
- **100% Day Completion**: Ascending triumphant celebration chord (C5, E5, G5, C6) + confetti burst.

---

## 🧠 AI Coach (Supabase Edge Function)

Located in [`supabase/functions/ai-coach/index.ts`](file:///e:/gggg/supabase/functions/ai-coach/index.ts):
- Tough-love persona analyzing 14-day telemetry and providing exactly 3 high-impact directives.
- Animated thinking dots and streaming typewriter text with blinking cursor.
- Automatic fallback synthesizer ensures coaching works out of the box in both live and prototype modes.

---

## ⚙️ 1-Click Preset Protocols & Settings

In the Settings view:
- **Full 16-Habit Arc**: Loads all 16 mental & physical discipline habits.
- **The Standard (8 Reel Habits)**: Loads the 8 core viral reel habits (Wake at 6 AM, Drink water, Cold shower, Read, 10k steps, Protein, No sugar, Sleep by 10 PM).
- Habit CRUD with interactive SVG icon picker.
- CSV and JSON full data telemetry export.
