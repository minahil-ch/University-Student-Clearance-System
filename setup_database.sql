-- ===============================================
-- REAL-TIME ROLE-BASED CLEARANCE SYSTEM SCHEMA
-- ===============================================

-- 1. DROP EXISTING TRIGGERS & FUNCTIONS TO AVOID CONFLICTS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. CREATE EXTENSIONS AND ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- We use TEXT for role to avoid enum update issues, but enforce constraints
-- Roles: student, admin, academic, library, transport, finance, hostel

-- 3. CREATE TABLES
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('student', 'admin', 'academic', 'library', 'transport', 'finance', 'hostel')),
    approved BOOLEAN DEFAULT FALSE,
    phone TEXT,
    cgpa TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    registration_no TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clearance_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.department_status (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_id UUID REFERENCES public.clearance_requests(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL CHECK (department_name IN ('library', 'transport', 'finance', 'hostel', 'academic')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(request_id, department_name)
);

-- 4. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_status ENABLE ROW LEVEL SECURITY;

-- 5. CREATE POLICIES
-- Users Policy
CREATE POLICY "Users can view their own profile and admins can view all"
ON public.users FOR SELECT
USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- Students Policy
CREATE POLICY "Students can view their own info, staff can view all"
ON public.students FOR SELECT
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role != 'student'));

-- Clearance Requests Policy
CREATE POLICY "Students view their requests, staff view all"
ON public.clearance_requests FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.students WHERE id = student_id AND user_id = auth.uid()) 
    OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role != 'student')
);

CREATE POLICY "Students can insert requests"
ON public.clearance_requests FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.students WHERE id = student_id AND user_id = auth.uid()));

CREATE POLICY "Staff can update requests"
ON public.clearance_requests FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role != 'student'));

-- Department Status Policy
CREATE POLICY "Everyone can view department status"
ON public.department_status FOR SELECT
USING (true);

CREATE POLICY "Staff can update their department status"
ON public.department_status FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND (role = department_name OR role = 'admin' OR role = 'academic')
    )
);

-- 6. AUTH TRIGGER FUNCTION (SIGNUP FLOW)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_role TEXT;
    v_approved BOOLEAN;
    v_name TEXT;
    v_department TEXT;
    v_reg_no TEXT;
    v_user_id UUID;
BEGIN
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'student');
    v_name := COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
    v_department := new.raw_user_meta_data->>'department';
    v_reg_no := new.raw_user_meta_data->>'registration_no';

    -- Auto-approve students and master admin
    IF v_role = 'student' OR new.email = 'admin@university.com' THEN
        v_approved := TRUE;
    ELSE
        v_approved := FALSE;
    END IF;

    -- Master Admin fallback role check
    IF new.email = 'admin@university.com' THEN
        v_role := 'admin';
    END IF;

    -- Cleanup duplicate email (prevent errors)
    DELETE FROM public.users WHERE email = new.email AND id != new.id;

    -- Insert User
    INSERT INTO public.users (id, name, email, role, approved)
    VALUES (new.id, v_name, new.email, v_role, v_approved)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        approved = EXCLUDED.approved;

    -- Insert Student Profile if role is student
    IF v_role = 'student' THEN
        INSERT INTO public.students (user_id, registration_no, department)
        VALUES (new.id, v_reg_no, v_department)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN new;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. AUTO-GENERATE DEPARTMENT STATUS ON NEW REQUEST
CREATE OR REPLACE FUNCTION public.init_department_status()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.department_status (request_id, department_name, status)
    VALUES 
        (new.id, 'library', 'pending'),
        (new.id, 'transport', 'pending'),
        (new.id, 'finance', 'pending'),
        (new.id, 'hostel', 'pending'),
        (new.id, 'academic', 'pending');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_clearance_request_created
  AFTER INSERT ON public.clearance_requests
  FOR EACH ROW EXECUTE PROCEDURE public.init_department_status();

-- 8. REAL-TIME CONFIGURATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.department_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clearance_requests;
