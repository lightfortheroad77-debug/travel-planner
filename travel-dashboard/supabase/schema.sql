-- Travel Dashboard: run ONCE in the Supabase SQL Editor.
-- RLS: every record is accessible ONLY to the authenticated owner of its trip.
-- No service-role key belongs in the frontend.
create extension if not exists pgcrypto;

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  country text not null default '',
  start_date date not null,
  end_date date not null,
  timezone text not null default 'Asia/Singapore',
  budget_currency text not null default 'SGD' check (budget_currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists idx_trips_owner on public.trips(owner_id);

create or replace function public.owns_trip(p_trip_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trips where id = p_trip_id and owner_id = (select auth.uid()));
$$;
revoke all on function public.owns_trip(uuid) from public;
grant execute on function public.owns_trip(uuid) to authenticated;

create table if not exists public.trip_days (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  day_number integer not null check (day_number > 0), title text not null default '', notes text not null default '',
  base_city_override text not null default '', color text not null default 'none',
  unique(trip_id, day_number), unique(trip_id,id)
);
create table if not exists public.travelers (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null check (length(trim(name)) > 0), unique(trip_id,id)
);
create table if not exists public.stays (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null, base_city text not null default '', check_in date not null, check_out date not null,
  address text not null default '', maps_url text not null default '',
  reservation_status text not null default 'none' check(reservation_status in ('none','to_reserve','reserved')),
  notes text not null default '', created_at timestamptz not null default now(),
  check(check_out > check_in),unique(trip_id,id)
);
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  day_number integer check(day_number > 0), start_time time, title text not null check(length(trim(title))>0),
  city_area text not null default '',kind text not null default 'activity' check(kind in ('activity','food','transport','other')),
  place text not null default '', origin text not null default '', destination text not null default '', maps_url text not null default '',
  reservation_status text not null default 'none' check(reservation_status in ('none','to_reserve','reserved')),
  action_needed boolean not null default false, notes text not null default '',
  created_at timestamptz not null default now(),unique(trip_id,id)
);
create index if not exists idx_activities_trip_day on public.activities(trip_id,day_number,start_time);
create table if not exists public.reservation_task_prefs (
  activity_id uuid primary key,trip_id uuid not null references public.trips(id) on delete cascade,
  assignee_id uuid, due_date date, notes text not null default '',hidden boolean not null default false,
  foreign key(trip_id,activity_id) references public.activities(trip_id,id) on delete cascade,
  foreign key(trip_id,assignee_id) references public.travelers(trip_id,id),
  unique(trip_id,activity_id)
);
create table if not exists public.stay_reservation_task_prefs (
  stay_id uuid primary key,trip_id uuid not null references public.trips(id) on delete cascade,
  assignee_id uuid,due_date date,notes text not null default '',hidden boolean not null default false,
  foreign key(trip_id,stay_id) references public.stays(trip_id,id) on delete cascade,
  foreign key(trip_id,assignee_id) references public.travelers(trip_id,id)
);
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null check(length(trim(title))>0), notes text not null default '', due_date date,
  assignee_id uuid, linked_day integer check(linked_day>0), linked_activity_id uuid,
  completed boolean not null default false,created_at timestamptz not null default now(),
  foreign key(trip_id,assignee_id) references public.travelers(trip_id,id),
  foreign key(trip_id,linked_activity_id) references public.activities(trip_id,id) on delete set null (linked_activity_id)
);
create table if not exists public.packing_categories (
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,position integer not null default 0, unique(trip_id,id)
);
create table if not exists public.packing_bags (
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null, unique(trip_id,id)
);
create table if not exists public.packing_items (
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  category_id uuid not null, name text not null check(length(trim(name))>0),
  owner_id uuid, responsible_id uuid, bag_id uuid,
  quantity integer not null default 1 check(quantity>=1 and quantity<=999), packed boolean not null default false,
  notes text not null default '',
  foreign key(trip_id,category_id) references public.packing_categories(trip_id,id),
  foreign key(trip_id,owner_id) references public.travelers(trip_id,id),
  foreign key(trip_id,responsible_id) references public.travelers(trip_id,id),
  foreign key(trip_id,bag_id) references public.packing_bags(trip_id,id)
);
create table if not exists public.souvenir_groups (
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,position integer not null default 0,unique(trip_id,id)
);
create table if not exists public.souvenir_recipients (
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  group_id uuid not null,name text not null,unique(trip_id,id),
  foreign key(trip_id,group_id) references public.souvenir_groups(trip_id,id)
);
create table if not exists public.souvenirs (
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  recipient_id uuid not null,name text not null check(length(trim(name))>0),quantity integer not null default 1 check(quantity>=1 and quantity<=999),
  bought boolean not null default false,notes text not null default '',buyer_id uuid,
  foreign key(trip_id,recipient_id) references public.souvenir_recipients(trip_id,id),
  foreign key(trip_id,buyer_id) references public.travelers(trip_id,id)
);
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,budget_base numeric(15,2) not null default 0 check(budget_base >= 0),position integer not null default 0,
  unique(trip_id,id)
);
create table if not exists public.trip_rates (
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  currency_code text not null check(currency_code ~ '^[A-Z]{3}$'),
  base_per_unit numeric(22,10) not null check(base_per_unit>0),
  updated_at timestamptz not null default now(),unique(trip_id,currency_code)
);
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  category_id uuid not null,title text not null check(length(trim(title))>0),spent_on date not null,
  currency_code text not null check(currency_code ~ '^[A-Z]{3}$'),
  amount_original numeric(15,2) not null check(amount_original>0),
  rate_to_base numeric(22,10) not null check(rate_to_base>0),
  amount_base numeric(15,2) generated always as (round(amount_original * rate_to_base,2)) stored,
  notes text not null default '', created_at timestamptz not null default now(),
  foreign key(trip_id,category_id) references public.expense_categories(trip_id,id)
);

alter table public.trips enable row level security;
drop policy if exists trips_select_own on public.trips;
create policy trips_select_own on public.trips for select to authenticated using(owner_id=(select auth.uid()));
drop policy if exists trips_insert_own on public.trips;
create policy trips_insert_own on public.trips for insert to authenticated with check(owner_id=(select auth.uid()));
drop policy if exists trips_update_own on public.trips;
create policy trips_update_own on public.trips for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
drop policy if exists trips_delete_own on public.trips;
create policy trips_delete_own on public.trips for delete to authenticated using(owner_id=(select auth.uid()));

-- Apply the same owner-based RLS to all dependent tables.
do $$
declare t text;
begin
 foreach t in array array['trip_days','travelers','stays','activities','reservation_task_prefs','stay_reservation_task_prefs','tasks','packing_categories','packing_bags','packing_items','souvenir_groups','souvenir_recipients','souvenirs','expense_categories','trip_rates','expenses'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('drop policy if exists owner_select on public.%I',t);
   execute format('drop policy if exists owner_insert on public.%I',t);
   execute format('drop policy if exists owner_update on public.%I',t);
   execute format('drop policy if exists owner_delete on public.%I',t);
   execute format('create policy owner_select on public.%I for select to authenticated using(public.owns_trip(trip_id))',t);
   execute format('create policy owner_insert on public.%I for insert to authenticated with check(public.owns_trip(trip_id))',t);
   execute format('create policy owner_update on public.%I for update to authenticated using(public.owns_trip(trip_id)) with check(public.owns_trip(trip_id))',t);
   execute format('create policy owner_delete on public.%I for delete to authenticated using(public.owns_trip(trip_id))',t);
 end loop;
end $$;

-- A fixed recorded expense is intentionally NOT recalculated when a trip rate changes.
-- Restrict frontend to public anon/publishable key; never deploy a service-role key.

-- Atomically save the Overview's title and quick time edits.
-- All activity updates succeed together or none do; unrelated activity fields stay untouched.
create or replace function public.save_day_quick_edit(
  p_trip_id uuid, p_day_number integer, p_title text, p_changes jsonb
) returns void language plpgsql security invoker set search_path = 'public' as $$
declare item jsonb;
begin
  if not public.owns_trip(p_trip_id) then raise exception 'Not authorised'; end if;
  if p_day_number < 1 or trim(coalesce(p_title,'')) = '' then raise exception 'Invalid day or title'; end if;
  if jsonb_typeof(p_changes) is distinct from 'array' then raise exception 'Expected an array of activity time changes'; end if;
  insert into public.trip_days(trip_id,day_number,title)
  values(p_trip_id,p_day_number,trim(p_title))
  on conflict(trip_id,day_number) do update set title=excluded.title;
  for item in select value from jsonb_array_elements(p_changes) loop
    update public.activities
       set start_time=nullif(item->>'time','')::time
     where id=(item->>'id')::uuid and trip_id=p_trip_id and day_number=p_day_number;
    if not found then raise exception 'Invalid activity in quick edit'; end if;
  end loop;
end;
$$;
revoke all on function public.save_day_quick_edit(uuid,integer,text,jsonb) from public;
grant execute on function public.save_day_quick_edit(uuid,integer,text,jsonb) to authenticated;

-- Explicit grants for PostgREST's authenticated role; anonymous clients have no table privileges.
do $$
declare t text;
begin
  foreach t in array array['trips','trip_days','travelers','stays','activities','reservation_task_prefs','stay_reservation_task_prefs','tasks','packing_categories','packing_bags','packing_items','souvenir_groups','souvenir_recipients','souvenirs','expense_categories','trip_rates','expenses'] loop
    execute format('revoke all on table public.%I from anon',t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated',t);
  end loop;
end $$;
