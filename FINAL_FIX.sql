-- ===============================================
-- 🚀 ULTIMATE REPAIR SCRIPT - RUN THIS IN SUPABASE
-- ===============================================

-- 1. DROP EVERYTHING OLD
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. RESET TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'student', 'department', 'transport', 'library');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE clearance_status_type AS ENUM ('pending', 'cleared', 'issue');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. ENSURE TABLE STRUCTURE
CREATE TABLE IF NOT EXISTS public.profiles (
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

-- 4. ULTRA-STABLE TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_role user_role;
    v_approved BOOLEAN;
BEGIN
    -- Extract role safely with default
    v_role := COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student'::user_role);

    -- Auto-approve master admin and all students
    IF new.email IN ('admin@university.com', 'minahilch821@gmail.com') OR v_role = 'student' THEN
        v_approved := TRUE;
    ELSE
        v_approved := FALSE;
    END IF;

    -- Handle existing profiles with same email (Prevent unique constraint violation)
    DELETE FROM public.profiles WHERE email = new.email AND id != new.id;

    -- Upsert profile
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
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        is_approved = EXCLUDED.is_approved,
        updated_at = NOW();

    -- Initialize clearance rows for students
    IF v_role = 'student' THEN
        INSERT INTO public.clearance_status (student_id, department_key, status)
        VALUES 
            (new.id, 'transport', 'pending'),
            (new.id, 'library', 'pending'),
            (new.id, regexp_replace(lower(coalesce(new.raw_user_meta_data->>'department_name', 'general')), '\s+', '-', 'g'), 'pending')
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN new;
EXCEPTION WHEN OTHERS THEN
    -- Never block auth signup
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ATTACH TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. FORCE PROMOTE ADMINS
INSERT INTO public.profiles (id, full_name, email, role, is_approved)
SELECT id, 'System Admin', email, 'admin', TRUE
FROM auth.users
WHERE email IN ('admin@university.com', 'minahilch821@gmail.com')
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    is_approved = TRUE;
