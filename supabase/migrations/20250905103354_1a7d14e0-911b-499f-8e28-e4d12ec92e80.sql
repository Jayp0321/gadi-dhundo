-- Enable RLS on spatial_ref_sys table to fix security warning
-- This is a PostGIS system table with public reference data
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow everyone to read spatial reference system data
CREATE POLICY "Everyone can read spatial reference systems" 
ON public.spatial_ref_sys 
FOR SELECT 
USING (true);