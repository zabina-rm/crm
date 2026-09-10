-- HomeBase CRM V3 upgrade
-- Run this ONCE in Supabase > SQL Editor after your V2 schema is already installed.
-- It preserves your existing contacts, deals, and tasks.

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
create policy "interactions owner access"
on public.interactions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists interactions_user_id_idx on public.interactions(user_id);
create index if not exists interactions_contact_id_idx on public.interactions(contact_id);
create index if not exists interactions_occurred_at_idx on public.interactions(occurred_at desc);
