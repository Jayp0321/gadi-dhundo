-- Enable RLS on PostGIS system table
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create policy for spatial_ref_sys (read-only for everyone since it's reference data)
CREATE POLICY "Allow read access to spatial reference systems" 
ON public.spatial_ref_sys FOR SELECT 
USING (true);