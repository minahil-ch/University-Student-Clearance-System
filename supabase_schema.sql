-- University Student Clearance Management System
-- Supabase SQL schema (Auth + PostgreSQL + Realtime + RBAC)

create extension if not exists pgcrypto;

do $$ begin
  create type user_role as enum ('admin', 'student', 'department', 'transport', 'library');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type clearance_state as enum ('pending', 'cleared', 'issue');
exception when duplicate_object then null;
end $$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null default 'Student',
  role user_role not null default 'student',
  is_approved boolean not null default false,
  department_name text,
  reg_no text,
  cgpa text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clearance_status (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  department_key text not null,
  status clearance_state not null default 'pending',
  remarks text,
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, department_key)
);

create table if not exists future_data (
  id uuid primary key default gen_random_uuid(),
  student_id uuid unique not null references profiles(id) on delete cascade,
  personal_email text,
  alternate_phone text,
  company_name text,
  job_title text,
  experience text,
  salary_range text,
  skills text,
  higher_education_uni text,
  country text,
  degree text,
  feedback text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  target_student_id uuid references profiles(id),
  department_key text,
  details jsonb,
  created_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tg_profiles_updated_at on profiles;
create trigger tg_profiles_updated_at before update on profiles
for each row execute procedure set_updated_at();

drop trigger if exists tg_clearance_updated_at on clearance_status;
create trigger tg_clearance_updated_at before update on clearance_status
for each row execute procedure set_updated_at();

create or replace function handle_new_user()
returns trigger as $$
declare
  v_role_text text;
  v_role user_role;
begin
  v_role_text := lower(coalesce(new.raw_user_meta_data->>'role', 'student'));
  if v_role_text in ('admin', 'student', 'department', 'transport', 'library') then
    v_role := v_role_text::user_role;
  else
    v_role := 'student'::user_role;
  end if;

  insert into profiles (
    id, email, full_name, role, is_approved, department_name
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_role,
    case when v_role = 'student' then true else false end,
    new.raw_user_meta_data->>'department_name'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    is_approved = excluded.is_approved,
    department_name = excluded.department_name;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure handle_new_user();

alter table profiles enable row level security;
alter table clearance_status enable row level security;
alter table future_data enable row level security;
alter table audit_logs enable row level security;

drop policy if exists profiles_select on profiles;
drop policy if exists profiles_insert on profiles;
drop policy if exists profiles_update on profiles;
drop policy if exists profiles_delete on profiles;
drop policy if exists clearance_all on clearance_status;
drop policy if exists future_data_all on future_data;
drop policy if exists audit_all on audit_logs;

create policy profiles_select on profiles
for select to authenticated using (true);

create policy profiles_insert on profiles
for insert to authenticated with check (auth.uid() = id);

create policy profiles_update on profiles
for update to authenticated using (auth.uid() = id or exists (
  select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy profiles_delete on profiles
for delete to authenticated using (auth.uid() = id);

create policy clearance_all on clearance_status
for all to authenticated using (true) with check (true);

create policy future_data_all on future_data
for all to authenticated using (true) with check (true);

create policy audit_all on audit_logs
for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table clearance_status;
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table audit_logs;
-- ===============================================
-- 🛡️ V9 FINAL PRODUCTION SQL - RUN THIS IN SUPABASE
-- ===============================================

-- STEP 1: DROP OLD TRIGGER AND FUNCTION
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- STEP 2: ENSURE TYPES EXIST
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'student', 'department', 'transport', 'library');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE clearance_status_type AS ENUM ('pending', 'cleared', 'issue');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- STEP 3: ENSURE TABLES EXIST (safe to re-run)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT 'User',
  father_name TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role user_role DEFAULT 'student',
  is_approved BOOLEAN DEFAULT FALSE,
  department_name TEXT,
  reg_no TEXT,
  cgpa TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clearance_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  department_key TEXT NOT NULL,
  status clearance_status_type DEFAULT 'pending',
  remarks TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, department_key)
);

CREATE TABLE IF NOT EXISTS future_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  personal_email TEXT,
  alternate_phone TEXT,
  office_email TEXT,
  company_name TEXT,
  job_title TEXT,
  experience TEXT,
  salary_range TEXT,
  skills TEXT,
  higher_education_uni TEXT,
  country TEXT,
  degree TEXT,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID,
  action TEXT NOT NULL,
  target_student_id UUID,
  department_key TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 4: ENABLE RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE future_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- STEP 5: DROP ALL OLD POLICIES (clean slate)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename IN ('profiles', 'clearance_status', 'future_data', 'audit_logs')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- STEP 6: CREATE SIMPLE, NON-RECURSIVE POLICIES
-- PROFILES: Full access for all authenticated users (no recursion)
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "profiles_delete" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- CLEARANCE: Full access for authenticated users
CREATE POLICY "clearance_all" ON clearance_status FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FUTURE DATA: Full access
CREATE POLICY "future_data_all" ON future_data FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- AUDIT: Full access
CREATE POLICY "audit_all" ON audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- STEP 7: THE FAILSAFE TRIGGER (V9)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_role_text TEXT;
    v_role user_role;
    v_approved BOOLEAN;
BEGIN
    -- Safely extract role
    v_role_text := LOWER(COALESCE(new.raw_user_meta_data->>'role', 'student'));

    -- Safely cast role
    IF v_role_text IN ('admin', 'student', 'department', 'transport', 'library') THEN
        v_role := v_role_text::user_role;
    ELSE
        v_role := 'student'::user_role;
    END IF;

    -- Determine approval
    -- Master admin and students are auto-approved
    IF new.email = 'admin@university.com' OR new.email = 'minahilch821@gmail.com' OR v_role = 'student' THEN
        v_approved := TRUE;
    ELSE
        v_approved := FALSE;
    END IF;

    -- 1. CLEANUP: Delete any existing profile with the same email but different ID (Orphaned profiles)
    DELETE FROM public.profiles WHERE email = new.email AND id != new.id;

    -- 2. Create/Update profile (SAFE)
    INSERT INTO public.profiles (
        id, full_name, email, role, is_approved,
        father_name, reg_no, phone, cgpa, department_name
    ) VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
        new.email,
        v_role,
        v_approved,
        new.raw_user_meta_data->>'father_name',
        new.raw_user_meta_data->>'reg_no',
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'cgpa',
        new.raw_user_meta_data->>'department_name'
    ) ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        is_approved = EXCLUDED.is_approved,
        father_name = COALESCE(EXCLUDED.father_name, profiles.father_name),
        reg_no = COALESCE(EXCLUDED.reg_no, profiles.reg_no),
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        cgpa = COALESCE(EXCLUDED.cgpa, profiles.cgpa),
        department_name = COALESCE(EXCLUDED.department_name, profiles.department_name),
        updated_at = NOW();

    -- Initialize clearance rows for students OR if it's the first time
    IF v_role = 'student' THEN
        INSERT INTO public.clearance_status (student_id, department_key)
        VALUES
            (new.id, 'transport'),
            (new.id, 'library'),
            (new.id, regexp_replace(lower(coalesce(new.raw_user_meta_data->>'department_name', 'general')), '\s+', '-', 'g'))
        ON CONFLICT (student_id, department_key) DO NOTHING;
    END IF;

    RETURN new;

EXCEPTION WHEN OTHERS THEN
    -- Log the error but NEVER fail the auth signup
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- STEP 8: PROMOTE ADMINS
INSERT INTO public.profiles (id, full_name, email, role, is_approved)
SELECT id, 'System Admin', email, 'admin', TRUE
FROM auth.users
WHERE email IN ('minahilch821@gmail.com', 'admin@university.com')
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    is_approved = TRUE;
