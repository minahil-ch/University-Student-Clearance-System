-- Add new roles to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'dispatch';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hostel';

-- Update the handle_new_user function to support new roles
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
    IF v_role_text IN ('admin', 'student', 'department', 'transport', 'library', 'dispatch', 'finance', 'hostel') THEN
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

    -- 1. CLEANUP: Delete any existing profile with the same email but different ID
    DELETE FROM public.profiles WHERE email = new.email AND id != new.id;

    -- 2. Create/Update profile
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

    -- Profile creation logic ends here. 
    -- Clearance rows are now initialized via the frontend Clearance Form 
    -- to ensure they only appear after formal submission.

    RETURN new;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
