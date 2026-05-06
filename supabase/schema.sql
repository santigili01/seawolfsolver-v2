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
