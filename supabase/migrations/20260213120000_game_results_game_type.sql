-- Distinguish full Sea Wolf sessions vs treatment-only vs future games.
alter table public.game_results
  add column if not exists game_type text not null default 'sea_wolf';

comment on column public.game_results.game_type is
  'sea_wolf | treatment | redrock (reserved); treatment rows use phase4_avg + site1_score only.';
