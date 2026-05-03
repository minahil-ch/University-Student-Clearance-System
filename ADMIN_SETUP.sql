-- ============================================================
-- CUI VEHARI CLEARANCE SYSTEM - ADMIN SETUP SQL
-- Run this in Supabase SQL Editor to ensure admin is set up
-- Admin Email: minahilch821@gmail.com
-- ============================================================

-- 1. Ensure the admin user profile exists and has correct role
-- (This runs ONLY after the admin has logged in at least once)
UPDATE profiles
SET 
  role = 'admin',
  is_approved = true,
  department_name = 'admin',
  full_name = COALESCE(full_name, 'System Administrator')
WHERE email = 'minahilch821@gmail.com';

-- 2. If no row was updated (admin hasn't logged in yet), this is fine.
-- The login page auto-creates the profile on first login.

-- 3. Verify the update worked
SELECT id, email, role, is_approved, department_name, full_name 
FROM profiles 
WHERE email = 'minahilch821@gmail.com';

-- 4. Make sure clearance_status table has proper structure
-- (department_key column used for matching)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clearance_status' AND column_name = 'department_key'
  ) THEN
    ALTER TABLE clearance_status ADD COLUMN department_key TEXT;
    -- Populate from department_name if it exists
    UPDATE clearance_status 
    SET department_key = CASE 
      WHEN LOWER(REPLACE(department_name, ' ', '-')) IN ('library', 'transport', 'finance', 'hostel', 'admin', 'student') 
      THEN LOWER(REPLACE(department_name, ' ', '-'))
      ELSE 'academic-' || LOWER(REPLACE(department_name, ' ', '-'))
    END
    WHERE department_key IS NULL AND department_name IS NOT NULL;
  END IF;
END $$;

-- 5. Ensure department_forms table exists for academic departments
CREATE TABLE IF NOT EXISTS department_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_key TEXT NOT NULL,
  form_name TEXT NOT NULL,
  form_link TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Ensure future_data (alumni survey) table has status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'future_data' AND column_name = 'status'
  ) THEN
    ALTER TABLE future_data ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- 7. Verify audit_logs table has correct foreign key columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'actor_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN actor_id UUID REFERENCES profiles(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'target_student_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN target_student_id UUID REFERENCES profiles(id);
  END IF;
END $$;

-- Done! Your system is ready.
SELECT 'CUI Vehari Clearance System - Setup Complete!' as status;
