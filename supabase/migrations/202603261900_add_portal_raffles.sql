create table if not exists public.portal_raffles (
  id uuid primary key default gen_random_uuid(),
  cycle_type text not null check (cycle_type in ('monthly', 'bimonthly')),
  title text not null,
  prize_title text not null,
  draw_date timestamptz not null,
  status text not null default 'open' check (status in ('open', 'closed', 'drawn')),
  total_coupons integer not null default 0,
  winning_number integer,
  winner_student_key text,
  winner_student_name text,
  created_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz,
  drawn_at timestamptz
);

create table if not exists public.portal_raffle_entries (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.portal_raffles(id) on delete cascade,
  student_key text not null,
  student_name text not null,
  student_email text,
  points integer not null default 0,
  coupons integer not null default 0,
  range_start integer not null,
  range_end integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  check (points >= 0),
  check (coupons >= 0),
  check (range_start >= 1),
  check (range_end >= range_start)
);

create index if not exists idx_portal_raffles_cycle_status
  on public.portal_raffles(cycle_type, status, created_at desc);

create index if not exists idx_portal_raffle_entries_raffle
  on public.portal_raffle_entries(raffle_id, range_start, range_end);

alter table public.portal_raffles enable row level security;
alter table public.portal_raffle_entries enable row level security;

drop policy if exists "public can read portal raffles" on public.portal_raffles;
create policy "public can read portal raffles"
on public.portal_raffles for select
using (true);

drop policy if exists "public can read portal raffle entries" on public.portal_raffle_entries;
create policy "public can read portal raffle entries"
on public.portal_raffle_entries for select
using (true);

drop policy if exists "authenticated users can manage portal raffles" on public.portal_raffles;
create policy "authenticated users can manage portal raffles"
on public.portal_raffles for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users can manage portal raffle entries" on public.portal_raffle_entries;
create policy "authenticated users can manage portal raffle entries"
on public.portal_raffle_entries for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
