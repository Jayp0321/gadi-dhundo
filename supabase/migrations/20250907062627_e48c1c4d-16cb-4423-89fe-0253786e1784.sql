-- Enable RLS on spatial_ref_sys table and create policy for public read access
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to spatial reference system data
CREATE POLICY "Allow public read access to spatial reference systems"
ON public.spatial_ref_sys
FOR SELECT
TO PUBLIC
USING (true);