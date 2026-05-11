-- Run this in Supabase SQL editor or via supabase db push.
-- Persists full-session simulator scores (Clerk user id = public.users.id).

create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users (id) on delete cascade,
  played_at timestamptz not null default now(),
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

-- Matches existing pattern: service role bypasses RLS; app uses supabaseAdmin after Clerk auth.
create policy "Service role full access to game_results"
  on public.game_results for all
  using (true)
  with check (true);
