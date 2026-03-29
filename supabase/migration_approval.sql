-- Run this in Supabase SQL editor to add approval workflow
-- supabase.com → project → SQL Editor

alter table bookings
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists approval_token uuid not null default gen_random_uuid(),
  add column if not exists responded_at timestamptz,
  add column if not exists duration_hours int not null default 1;

create unique index if not exists bookings_approval_token_idx
  on bookings (approval_token);
