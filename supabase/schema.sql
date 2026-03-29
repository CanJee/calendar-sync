-- Run this in Supabase SQL editor: supabase.com → project → SQL Editor

create table if not exists bookings (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  activity_type text not null check (activity_type in ('food','tennis','pickleball','coffee','drinks','social','other')),
  start_time   timestamptz not null,
  end_time     timestamptz not null,
  booked_by_name  text not null,
  booked_by_email text,
  note         text,
  secret_token uuid not null default gen_random_uuid(),
  created_at   timestamptz not null default now()
);

-- Index for time-range queries
create index if not exists bookings_time_idx on bookings (start_time, end_time);

-- Secret token must be unique (used for cancellation links)
create unique index if not exists bookings_secret_token_idx on bookings (secret_token);

-- Row-level security: public can insert, only service role can read/delete
alter table bookings enable row level security;

create policy "Anyone can create a booking"
  on bookings for insert with check (true);

create policy "Service role has full access"
  on bookings for all using (auth.role() = 'service_role');
