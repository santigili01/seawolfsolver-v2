create table if not exists public.users (
  id text primary key,
  email text not null,
  created_at timestamptz default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id),
  variant_id text not null,
  order_id text not null unique,
  created_at timestamptz default now()
);

alter table public.users enable row level security;
alter table public.purchases enable row level security;

create policy "Service role full access to users"
  on public.users for all
  using (true);

create policy "Service role full access to purchases"
  on public.purchases for all
  using (true);

-- See migrations/20260212120000_game_results.sql for full DDL; mirrored here for local reference.
create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users (id) on delete cascade,
  played_at timestamptz not null default now(),
  game_type text not null default 'sea_wolf',
  global_score numeric not null,
  time_taken integer not null,
  phase1_avg numeric,
  phase2_avg numeric,
  phase0_avg numeric,
  phase3_avg numeric,
  phase4_avg numeric,
  site1_score numeric,
  site2_score numeric,
  site3_score numeric,
  site1_scenario text,
  site2_scenario text,
  site3_scenario text
);

create index if not exists game_results_user_played_idx on public.game_results (user_id, played_at desc);

alter table public.game_results enable row level security;

create policy "Service role full access to game_results"
  on public.game_results for all
  using (true)
  with check (true);
