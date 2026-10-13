-- Simple RLS disable script (run this in Supabase SQL Editor)
-- This won't recreate any types, just disables RLS

ALTER TABLE IF EXISTS public.properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.units DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenancies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rent_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance_requests DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON public.properties TO authenticated;
GRANT ALL ON public.units TO authenticated;
GRANT ALL ON public.tenancies TO authenticated;
GRANT ALL ON public.rent_payments TO authenticated;
GRANT ALL ON public.maintenance_requests TO authenticated;

-- Also grant to anon for demo purposes (remove in production)
GRANT ALL ON public.properties TO anon;
GRANT ALL ON public.units TO anon;
GRANT ALL ON public.tenancies TO anon;
GRANT ALL ON public.rent_payments TO anon;
GRANT ALL ON public.maintenance_requests TO anon;
