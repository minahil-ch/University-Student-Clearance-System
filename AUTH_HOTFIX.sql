-- ===============================================
-- AUTH HOTFIX (run in Supabase SQL editor)
-- Fixes: "Database error saving new user" (Auth 500)
-- ===============================================

create extension if not exists pgcrypto;

-- Remove any broken trigger/function first
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

do $$ begin
  create type user_role as enum ('admin', 'student', 'department', 'transport', 'library');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'User',
  father_name text,
  email text unique not null,
  phone text,
  role user_role default 'student',
  is_approved boolean default false,
  department_name text,
  reg_no text,
  cgpa text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.clearance_status (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  department_key text not null,
  status text not null default 'pending',
  remarks text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz default now(),
  unique(student_id, department_key)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_text text;
  v_role user_role;
  v_dept text;
begin
  v_role_text := lower(coalesce(new.raw_user_meta_data->>'role', 'student'));
  if v_role_text in ('admin', 'student', 'department', 'transport', 'library') then
    v_role := v_role_text::user_role;
  else
    v_role := 'student'::user_role;
  end if;

  v_dept := coalesce(new.raw_user_meta_data->>'department_name', null);

  -- cleanup duplicate orphan profile row by same email
  delete from public.profiles where email = new.email and id <> new.id;

  insert into public.profiles (
    id, full_name, father_name, email, phone, role, is_approved, department_name, reg_no, cgpa
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    new.raw_user_meta_data->>'father_name',
    new.email,
    new.raw_user_meta_data->>'phone',
    v_role,
    case when v_role = 'student' or new.email in ('admin@university.com', 'minahilch821@gmail.com') then true else false end,
    v_dept,
    new.raw_user_meta_data->>'reg_no',
    new.raw_user_meta_data->>'cgpa'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    father_name = coalesce(excluded.father_name, profiles.father_name),
    email = excluded.email,
    phone = coalesce(excluded.phone, profiles.phone),
    role = excluded.role,
    is_approved = excluded.is_approved,
    department_name = coalesce(excluded.department_name, profiles.department_name),
    reg_no = coalesce(excluded.reg_no, profiles.reg_no),
    cgpa = coalesce(excluded.cgpa, profiles.cgpa),
    updated_at = now();

  if v_role = 'student' then
    insert into public.clearance_status(student_id, department_key, status)
    values
      (new.id, 'transport', 'pending'),
      (new.id, 'library', 'pending'),
      (new.id, regexp_replace(lower(coalesce(v_dept, 'general')), '\s+', '-', 'g'), 'pending')
    on conflict (student_id, department_key) do nothing;
  end if;

  return new;
exception when others then
  raise warning 'handle_new_user failed for %: %', new.email, sqlerrm;
  return new; -- must never block auth signup
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Backfill missing profiles for existing users
insert into public.profiles (id, full_name, email, role, is_approved)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', 'User'), u.email, 'student'::user_role, true
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Ensure root admin accounts exist and are approved
insert into public.profiles (id, full_name, email, role, is_approved)
select id, 'System Admin', email, 'admin'::user_role, true
from auth.users
where email in ('admin@university.com', 'minahilch821@gmail.com')
on conflict (id) do update set role = 'admin'::user_role, is_approved = true;
