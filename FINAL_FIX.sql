-- ===============================================
-- 🚀 ULTIMATE REPAIR SCRIPT - RUN THIS IN SUPABASE
-- ===============================================

-- 1. DROP EVERYTHING OLD
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. RESET TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'student', 'department', 'transport', 'library', 'finance', 'hostel');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE clearance_status_type AS ENUM ('pending', 'cleared', 'issue');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. DROP ALL POLICIES TO AVOID TYPE CONFLICTS
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

-- 4. ENSURE TABLE STRUCTURE AND ADD MISSING COLUMNS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT 'User',
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'student',
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add potentially missing columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reg_no TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cgpa TEXT;

-- Safely drop role default if it exists and change to TEXT
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN role TYPE TEXT USING role::text;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'student';

CREATE TABLE IF NOT EXISTS public.clearance_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_key TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  remarks TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, department_key)
);

-- Safely change status to TEXT
ALTER TABLE public.clearance_status ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.clearance_status ALTER COLUMN status TYPE TEXT USING status::text;
ALTER TABLE public.clearance_status ALTER COLUMN status SET DEFAULT 'pending';

-- Add form_submitted flag for academic google forms
ALTER TABLE public.clearance_status ADD COLUMN IF NOT EXISTS form_submitted BOOLEAN DEFAULT FALSE;

-- Create department settings for storing google form links
CREATE TABLE IF NOT EXISTS public.department_settings (
  department_key TEXT PRIMARY KEY,
  google_form_link TEXT
);

-- 4. ULTRA-STABLE TRIGGER FUNCTION USING DYNAMIC SQL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_role TEXT;
    v_approved BOOLEAN;
    v_dept_key TEXT;
BEGIN
    -- Extract role safely with default
    v_role := COALESCE((new.raw_user_meta_data->>'role'), 'student');

    -- Auto-approve master admin and all students
    IF new.email IN ('admin@university.com', 'minahilch821@gmail.com') OR v_role = 'student' THEN
        v_approved := TRUE;
    ELSE
        v_approved := FALSE;
    END IF;

    -- Handle existing profiles with same email (Prevent unique constraint violation)
    EXECUTE 'DELETE FROM public.profiles WHERE email = $1 AND id != $2'
    USING new.email, new.id;

    -- Upsert profile using Dynamic SQL
    EXECUTE '
        INSERT INTO public.profiles (
            id, full_name, email, role, is_approved,
            father_name, reg_no, phone, cgpa, department_name
        ) VALUES (
            $1, COALESCE($2, ''User''), $3, $4, $5, $6, $7, $8, $9, $10
        ) ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            is_approved = EXCLUDED.is_approved,
            father_name = EXCLUDED.father_name,
            reg_no = EXCLUDED.reg_no,
            phone = EXCLUDED.phone,
            cgpa = EXCLUDED.cgpa,
            department_name = EXCLUDED.department_name,
            updated_at = NOW();
    ' USING 
        new.id, 
        new.raw_user_meta_data->>'full_name', 
        new.email, 
        v_role, 
        v_approved, 
        new.raw_user_meta_data->>'father_name', 
        new.raw_user_meta_data->>'reg_no', 
        new.raw_user_meta_data->>'phone', 
        new.raw_user_meta_data->>'cgpa', 
        new.raw_user_meta_data->>'department_name';

    -- Initialize clearance rows for students
    IF v_role = 'student' THEN
        v_dept_key := regexp_replace(lower(coalesce(new.raw_user_meta_data->>'department_name', 'general')), '\s+', '-', 'g');
        
        EXECUTE '
            INSERT INTO public.clearance_status (student_id, department_key, status)
            VALUES 
                ($1, ''transport'', ''pending''),
                ($1, ''library'', ''pending''),
                ($1, $2, ''pending'')
            ON CONFLICT DO NOTHING;
        ' USING new.id, v_dept_key;
    END IF;

    RETURN new;
EXCEPTION WHEN OTHERS THEN
    -- Log the error to Supabase Postgres logs but never fail the signup!
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ATTACH TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. FORCE PROMOTE ADMINS
DO $$
BEGIN
    EXECUTE '
        INSERT INTO public.profiles (id, full_name, email, role, is_approved)
        SELECT id, ''System Admin'', email, ''admin'', TRUE
        FROM auth.users
        WHERE email IN (''admin@university.com'', ''minahilch821@gmail.com'')
        ON CONFLICT (id) DO UPDATE SET
            role = ''admin'',
            is_approved = TRUE;
    ';
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors
END $$;

-- 7. RE-CREATE SIMPLE POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.future_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE POLICY "clearance_all" ON public.clearance_status FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "future_data_all" ON public.future_data FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "audit_all" ON public.audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "dept_settings_select" ON public.department_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "dept_settings_all" ON public.department_settings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND (public.profiles.role = 'admin' OR public.profiles.role = 'department'))) WITH CHECK (true);

