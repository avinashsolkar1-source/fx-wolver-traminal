-- FX WOLVER Backtesting — migration 001
-- Run in Supabase SQL editor ON A DEV/BRANCH PROJECT FIRST. Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- Every table: user_id = auth.uid() enforced by Row Level Security. Nothing here touches your existing tables.

create extension if not exists "pgcrypto";

-- ---------- parent tables ----------
create table if not exists public.bt_datasets (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,                       -- {symbol, market, tf, rows, from, to, source, filename, quality{...}}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bt_dataset_chunks (
  dataset_id uuid not null references public.bt_datasets(id) on delete cascade,
  idx int not null check (idx >= 0),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,                       -- [[t,o,h,l,c,v], ...] up to 5000 rows
  primary key (dataset_id, idx)
);

create table if not exists public.bt_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,                       -- settings + replay progress + summary
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- session children (cascade delete with the session) ----------
do $$
declare t text;
begin
  foreach t in array array['trades','journal','drawings','layouts','zones','screenshots'] loop
    execute format($f$
      create table if not exists public.bt_%1$s (
        id uuid primary key,
        user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
        session_id uuid references public.bt_sessions(id) on delete cascade,
        data jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )$f$, t);
    execute format('create index if not exists bt_%1$s_session_idx on public.bt_%1$s(session_id)', t);
  end loop;
end $$;

-- ---------- user-level tables ----------
do $$
declare t text;
begin
  foreach t in array array['strategies','indicator_templates','settings','prop_configs','imports'] loop
    execute format($f$
      create table if not exists public.bt_%1$s (
        id text primary key,
        user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
        session_id uuid,
        data jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )$f$, t);
  end loop;
end $$;
-- note: the client namespaces the settings row id as 'settings:<user uuid>' so primary keys never clash between users.

-- ---------- Row Level Security ----------
do $$
declare t text;
begin
  foreach t in array array['datasets','dataset_chunks','sessions','trades','journal','drawings','layouts','zones','screenshots','strategies','indicator_templates','settings','prop_configs','imports'] loop
    execute format('alter table public.bt_%1$s enable row level security', t);
    execute format('drop policy if exists "own_select" on public.bt_%1$s', t);
    execute format('drop policy if exists "own_insert" on public.bt_%1$s', t);
    execute format('drop policy if exists "own_update" on public.bt_%1$s', t);
    execute format('drop policy if exists "own_delete" on public.bt_%1$s', t);
    execute format('create policy "own_select" on public.bt_%1$s for select to authenticated using (user_id = auth.uid())', t);
    execute format('create policy "own_insert" on public.bt_%1$s for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('create policy "own_update" on public.bt_%1$s for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "own_delete" on public.bt_%1$s for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;

-- anon role gets nothing
revoke all on all tables in schema public from anon;
-- (if your existing site needs anon access to OTHER tables, re-grant on those tables only; bt_* stay private)
grant select, insert, update, delete on
  public.bt_datasets, public.bt_dataset_chunks, public.bt_sessions, public.bt_trades, public.bt_journal, public.bt_drawings,
  public.bt_layouts, public.bt_zones, public.bt_screenshots, public.bt_strategies, public.bt_indicator_templates,
  public.bt_settings, public.bt_prop_configs, public.bt_imports
to authenticated;

-- ---------- rollback (run manually only if you want to remove the module) ----------
-- drop table if exists public.bt_dataset_chunks, public.bt_trades, public.bt_journal, public.bt_drawings, public.bt_layouts, public.bt_zones,
--   public.bt_screenshots, public.bt_sessions, public.bt_datasets, public.bt_strategies, public.bt_indicator_templates, public.bt_settings,
--   public.bt_prop_configs, public.bt_imports cascade;
