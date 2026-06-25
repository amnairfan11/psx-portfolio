-- Run this once in Supabase SQL Editor → New Query

create table if not exists public.stocks (
  id           uuid        default gen_random_uuid() primary key,
  user_id      uuid        references auth.users(id) on delete cascade not null,
  ticker       text        not null,
  shares       numeric     not null default 0,
  avg_rate     numeric     not null default 0,
  sell_price   numeric     not null default 0,
  price_min    numeric     not null default 0,
  price_max    numeric     not null default 0,
  brok_rate    numeric     not null default 0.0015,
  custom_brok  boolean     not null default false,
  created_at   timestamptz default now()
);

alter table public.stocks enable row level security;

create policy "Users can read own stocks"
  on public.stocks for select using (auth.uid() = user_id);

create policy "Users can insert own stocks"
  on public.stocks for insert with check (auth.uid() = user_id);

create policy "Users can update own stocks"
  on public.stocks for update using (auth.uid() = user_id);

create policy "Users can delete own stocks"
  on public.stocks for delete using (auth.uid() = user_id);
