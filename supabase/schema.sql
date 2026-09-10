-- Run this in Supabase > SQL Editor.
-- Every row belongs to the signed-in user. RLS prevents users from seeing one another's data.

create extension if not exists pgcrypto;

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  type text not null default 'Buyer',
  stage text not null default 'New Lead',
  budget numeric default 0,
  lead_source text,
  property_notes text,
  notes text,
  next_follow_up date,
  created_at timestamptz not null default now()
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  title text not null,
  property_address text,
  status text not null default 'Active',
  price numeric default 0,
  expected_commission numeric default 0,
  closing_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  title text not null,
  due_date date not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "contacts owner access" on public.contacts;
create policy "contacts owner access" on public.contacts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "deals owner access" on public.deals;
create policy "deals owner access" on public.deals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks owner access" on public.tasks;
create policy "tasks owner access" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists contacts_user_id_idx on public.contacts(user_id);
create index if not exists deals_user_id_idx on public.deals(user_id);
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_due_date_idx on public.tasks(due_date);

-- V3 additions (safe for fresh installs or reruns)
alter table public.contacts add column if not exists preferred_areas text;
alter table public.contacts add column if not exists property_type text;
alter table public.contacts add column if not exists bedrooms_min numeric;
alter table public.contacts add column if not exists bathrooms_min numeric;
alter table public.contacts add column if not exists timeline text;

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  type text not null default 'Note',
  summary text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.interactions enable row level security;
drop policy if exists "interactions owner access" on public.interactions;
create policy "interactions owner access" on public.interactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists interactions_user_id_idx on public.interactions(user_id);
create index if not exists interactions_contact_id_idx on public.interactions(contact_id);
create index if not exists interactions_occurred_at_idx on public.interactions(occurred_at desc);
