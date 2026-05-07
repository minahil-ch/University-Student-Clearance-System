-- Add degree fulfillment logistics columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'shipping_address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN shipping_address TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'dispatch_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN dispatch_status TEXT DEFAULT 'pending'; -- pending, verified, processing, shipped, delivered
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'tracking_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tracking_number TEXT;
  END IF;
END $$;
