-- Add dispatch related columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dispatch_status TEXT DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tracking_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_verified BOOLEAN DEFAULT FALSE;

-- Update RLS for these new columns
DROP POLICY IF EXISTS "profiles_write_self" ON public.profiles;
CREATE POLICY "profiles_write_self" ON public.profiles 
FOR UPDATE TO authenticated 
USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'dispatch'));

SELECT '✅ Dispatch columns added and RLS updated' as status;
