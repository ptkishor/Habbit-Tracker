-- ============================================================
-- Winter Arc Tracker — Supabase Database Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ── Enable UUID extension ──
create extension if not exists "uuid-ossp";

-- ── 1. Profiles ──────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text,
  start_date      date not null default current_date,
  duration_days   int  not null default 90,
  threshold       int  not null default 80,  -- completion % to count a day as "done"
  privacy_mode    boolean not null default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- In case profiles table already existed from earlier schema:
alter table public.profiles add column if not exists display_name text;
alter table public.profiles alter column start_date set default current_date;

-- Row Level Security for profiles
alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- ── 2. Habits ────────────────────────────────────────────────
create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('check', 'number')),
  target      numeric,           -- for number habits: daily target
  unit        text,              -- e.g. "L", "steps", "pages"
  color       text,              -- icon / accent identifier e.g. "shield", "drop", "moon"
  position    int  not null default 1,
  archived    boolean not null default false,
  created_at  timestamptz default now()
);

-- In case habits table already existed from earlier schema:
alter table public.habits add column if not exists color text;

alter table public.habits enable row level security;

drop policy if exists "Users can view their own habits" on public.habits;
create policy "Users can view their own habits"
  on public.habits for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own habits" on public.habits;
create policy "Users can insert their own habits"
  on public.habits for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own habits" on public.habits;
create policy "Users can update their own habits"
  on public.habits for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own habits" on public.habits;
create policy "Users can delete their own habits"
  on public.habits for delete
  using (auth.uid() = user_id);

-- ── 3. Logs ──────────────────────────────────────────────────
create table if not exists public.logs (
  id          uuid primary key default gen_random_uuid(),
  habit_id    uuid not null references public.habits(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  status      text check (status in ('done', 'missed')),  -- null = not yet logged
  value       numeric,           -- for number habits: actual value logged
  notes       text,              -- optional notes
  created_at  timestamptz default now(),

  -- Each habit can only have one log per day
  unique (habit_id, date)
);

-- In case logs table already existed from earlier schema:
alter table public.logs add column if not exists notes text;

alter table public.logs enable row level security;

drop policy if exists "Users can view their own logs" on public.logs;
create policy "Users can view their own logs"
  on public.logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own logs" on public.logs;
create policy "Users can insert their own logs"
  on public.logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own logs" on public.logs;
create policy "Users can update their own logs"
  on public.logs for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own logs" on public.logs;
create policy "Users can delete their own logs"
  on public.logs for delete
  using (auth.uid() = user_id);

-- ── 4. Reviews (AI Coach history) ─────────────────────────────
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz default now(),
  week_start  date not null,
  content     text not null
);

alter table public.reviews enable row level security;

drop policy if exists "Users can view their own reviews" on public.reviews;
create policy "Users can view their own reviews"
  on public.reviews for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own reviews" on public.reviews;
create policy "Users can insert their own reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

-- ── 5. Indexes ───────────────────────────────────────────────
create index if not exists logs_user_date_idx on public.logs (user_id, date);
create index if not exists logs_habit_date_idx on public.logs (habit_id, date);
create index if not exists habits_user_position_idx on public.habits (user_id, position);
create index if not exists reviews_user_created_idx on public.reviews (user_id, created_at desc);

-- ── 6. Trigger on auth.users: Auto-create profile & seed 16 core habits ──
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

-- ── 7. Updated_at Trigger for profiles ────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();
