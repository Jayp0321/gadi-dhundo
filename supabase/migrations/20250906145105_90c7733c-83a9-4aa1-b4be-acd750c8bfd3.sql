-- Enable RLS on spatial_ref_sys (PostGIS system table)
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow read access to spatial_ref_sys for all authenticated users
CREATE POLICY "Allow read access to spatial reference systems" ON public.spatial_ref_sys
FOR SELECT USING (true);

-- Create evidence storage bucket for theft report photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence', 'evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for evidence bucket
CREATE POLICY "Users can upload evidence photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'evidence' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view evidence photos" ON storage.objects
FOR SELECT USING (bucket_id = 'evidence');

CREATE POLICY "Users can update their evidence photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'evidence' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);