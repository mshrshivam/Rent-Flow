-- Add language preference to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';

-- Add some sample language preferences
COMMENT ON COLUMN public.profiles.preferred_language IS 'User preferred language for communication (en, hi, ta, etc.)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language ON public.profiles(preferred_language);
