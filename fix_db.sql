-- ===============================================
-- 🔧 DB REPAIR SCRIPT - RUN THIS IN SUPABASE
-- ===============================================

-- 1. Ensure Types exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'student', 'department', 'transport', 'library');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE clearance_status_type AS ENUM ('pending', 'cleared', 'issue');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Ensure Profiles Table is correct
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

-- 3. The Improved Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_role_text TEXT;
    v_role user_role;
    v_approved BOOLEAN;
BEGIN
    -- 1. Extract role safely
    v_role_text := LOWER(COALESCE(new.raw_user_meta_data->>'role', 'student'));
    
    -- 2. Map role text to enum
    CASE v_role_text
        WHEN 'admin' THEN v_role := 'admin'::user_role;
        WHEN 'student' THEN v_role := 'student'::user_role;
        WHEN 'department' THEN v_role := 'department'::user_role;
        WHEN 'transport' THEN v_role := 'transport'::user_role;
        WHEN 'library' THEN v_role := 'library'::user_role;
        ELSE v_role := 'student'::user_role;
    END CASE;

    -- 3. Determine approval
    -- Admin email and all students are auto-approved
    IF new.email = 'minahilch821@gmail.com' OR v_role = 'student' OR v_role = 'admin' THEN
        v_approved := TRUE;
    ELSE
        v_approved := FALSE;
    END IF;

    -- 4. Insert/Update Profile
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
        role = EXCLUDED.role,
        is_approved = EXCLUDED.is_approved,
        updated_at = NOW();

    -- 5. Initialize Clearance for Students
    IF v_role = 'student' THEN
        INSERT INTO public.clearance_status (student_id, department_key)
        VALUES 
            (new.id, 'transport'),
            (new.id, 'library'),
            (new.id, 'administration')
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN new;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. CATCH UP: Create profiles for existing users who are missing them
INSERT INTO public.profiles (id, full_name, email, role, is_approved)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', 'User'), 
    email, 
    LOWER(COALESCE(raw_user_meta_data->>'role', 'student'))::user_role,
    CASE 
        WHEN email = 'minahilch821@gmail.com' THEN TRUE
        WHEN LOWER(COALESCE(raw_user_meta_data->>'role', 'student')) = 'student' THEN TRUE
        ELSE FALSE
    END
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 6. Ensure Admin is set
UPDATE public.profiles 
SET role = 'admin', is_approved = TRUE 
WHERE email = 'minahilch821@gmail.com';
