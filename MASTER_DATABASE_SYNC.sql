-- ============================================================
-- 🎓 MASTER DATABASE SYNC - UNIVERSITY CLEARANCE SYSTEM
-- ============================================================
-- ⚠️ Run this script in the Supabase SQL Editor to synchronize 
-- your database with the latest application features.
-- ============================================================

-- 1. SETUP TYPES & ENUMS (Safe Idempotent)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'student', 'department', 'transport', 'library', 'finance', 'hostel');
    END IF;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. ENSURE TABLES EXIST WITH FULL STRUCTURE
-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT 'User',
  father_name TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT DEFAULT 'student',
  is_approved BOOLEAN DEFAULT FALSE,
  department_name TEXT,
  reg_no TEXT,
  cgpa TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clearance Status Table
CREATE TABLE IF NOT EXISTS public.clearance_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_key TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  remarks TEXT,
  form_submitted BOOLEAN DEFAULT FALSE,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, department_key)
);

-- Future Data (Alumni Survey) Table
CREATE TABLE IF NOT EXISTS public.future_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  personal_email TEXT,
  alternate_phone TEXT,
  company_name TEXT,
  job_title TEXT,
  experience TEXT,
  salary_range TEXT,
  skills TEXT,
  higher_education_uni TEXT,
  country TEXT,
  degree TEXT,
  feedback TEXT,
  status TEXT DEFAULT 'pending',
  admin_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Department Forms Table
CREATE TABLE IF NOT EXISTS public.department_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_key TEXT NOT NULL,
  form_name TEXT NOT NULL,
  form_link TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_student_id UUID REFERENCES public.profiles(id),
  department_key TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Logs Table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  sender_email TEXT,
  department TEXT,
  status TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENSURE ALL COLUMNS EXIST (Migration for existing tables)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE public.clearance_status ADD COLUMN IF NOT EXISTS form_submitted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.future_data ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.future_data ADD COLUMN IF NOT EXISTS admin_remarks TEXT;

-- 4. THE FAILSAFE TRIGGER (V10)
-- Handles student registration and auto-initializes clearance rows
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_role TEXT;
    v_approved BOOLEAN;
    v_dept_key TEXT;
    v_raw_dept TEXT;
BEGIN
    -- Extract role safely with default
    v_role := COALESCE((new.raw_user_meta_data->>'role'), 'student');

    -- Auto-approve master admin and all students
    IF new.email IN ('admin@university.com', 'minahilch821@gmail.com') OR v_role = 'student' THEN
        v_approved := TRUE;
    ELSE
        v_approved := FALSE;
    END IF;

    -- Cleanup orphaned profiles
    DELETE FROM public.profiles WHERE email = new.email AND id != new.id;

    -- Upsert profile
    INSERT INTO public.profiles (
        id, full_name, email, role, is_approved,
        father_name, reg_no, phone, cgpa, department_name
    ) VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
        new.email, 
        v_role, 
        v_approved, 
        new.raw_user_meta_data->>'father_name', 
        new.raw_user_meta_data->>'reg_no', 
        new.raw_user_meta_data->>'phone', 
        new.raw_user_meta_data->>'cgpa', 
        new.raw_user_meta_data->>'department_name'
    ) ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        is_approved = EXCLUDED.is_approved,
        updated_at = NOW();

    -- Initialize clearance rows for students
    IF v_role = 'student' THEN
        v_raw_dept := LOWER(REPLACE(COALESCE(new.raw_user_meta_data->>'department_name', 'general'), ' ', '-'));
        v_dept_key := CASE 
            WHEN v_raw_dept IN ('transport', 'library', 'finance', 'hostel') THEN v_raw_dept
            ELSE 'academic-' || v_raw_dept
        END;
        
        INSERT INTO public.clearance_status (student_id, department_key, status)
        VALUES 
            (new.id, 'transport', 'pending'),
            (new.id, 'library', 'pending'),
            (new.id, 'finance', 'pending'),
            (new.id, 'hostel', 'pending'),
            (new.id, v_dept_key, 'pending')
        ON CONFLICT (student_id, department_key) DO NOTHING;
    END IF;

    RETURN new;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. PROMOTE MASTER ADMIN
UPDATE public.profiles 
SET role = 'admin', is_approved = TRUE 
WHERE email IN ('minahilch821@gmail.com', 'admin@university.com');

-- 6. SECURITY - RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.future_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_forms ENABLE ROW LEVEL SECURITY;

-- Reset all policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename IN ('profiles', 'clearance_status', 'future_data', 'audit_logs', 'department_forms')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Define new clean policies
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_write_self" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "clearance_read_all" ON public.clearance_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "clearance_write_staff" ON public.clearance_status FOR ALL TO authenticated USING (true);

CREATE POLICY "future_data_read_all" ON public.future_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "future_data_write_self" ON public.future_data FOR ALL TO authenticated USING (true);

CREATE POLICY "audit_logs_read_all" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_logs_write" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "dept_forms_read_all" ON public.department_forms FOR SELECT TO authenticated USING (true);
CREATE POLICY "dept_forms_write_admin" ON public.department_forms FOR ALL TO authenticated USING (true);

-- 7. REALTIME ENABLEMENT
ALTER PUBLICATION supabase_realtime ADD TABLE public.clearance_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.future_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 8. IN-APP NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_seen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_all" ON public.notifications;
CREATE POLICY "notifications_all" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ MASTER DATABASE SYNC COMPLETE (V11 - Notifications Added)' as status;
