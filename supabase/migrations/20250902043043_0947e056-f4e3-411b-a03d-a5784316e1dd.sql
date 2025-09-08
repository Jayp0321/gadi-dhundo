-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  proof_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  fcm_token TEXT,
  location GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'vehicle',
  vehicle_no TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  radius_m INTEGER NOT NULL DEFAULT 1000,
  expiry_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '2 hours'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'false')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create confirmations table
CREATE TABLE public.confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('seen', 'false', 'call_police')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_id, user_id)
);

-- Create notification logs table
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('fcm', 'sms', 'realtime')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for reports
CREATE POLICY "Users can view all active reports" 
ON public.reports FOR SELECT 
USING (expiry_at > now());

CREATE POLICY "Users can create their own reports" 
ON public.reports FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports" 
ON public.reports FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for confirmations
CREATE POLICY "Users can view confirmations for active reports" 
ON public.confirmations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.reports 
    WHERE id = report_id AND expiry_at > now()
  )
);

CREATE POLICY "Users can create confirmations" 
ON public.confirmations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for notification logs
CREATE POLICY "Users can view their own notification logs" 
ON public.notification_logs FOR SELECT 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_reports_location ON public.reports USING GIST(location);
CREATE INDEX idx_reports_expiry ON public.reports(expiry_at);
CREATE INDEX idx_profiles_location ON public.profiles USING GIST(location);
CREATE INDEX idx_reports_user_created ON public.reports(user_id, created_at);

-- Create storage buckets for ID proofs and report photos
INSERT INTO storage.buckets (id, name, public) VALUES ('id-proofs', 'id-proofs', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('report-photos', 'report-photos', true);

-- Storage policies for ID proofs (private)
CREATE POLICY "Users can upload their own ID proof" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'id-proofs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own ID proof" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'id-proofs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for report photos (public)
CREATE POLICY "Anyone can view report photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'report-photos');

CREATE POLICY "Authenticated users can upload report photos" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'report-photos' AND 
  auth.role() = 'authenticated'
);

-- Function to update location in reports table when lat/lon changes
CREATE OR REPLACE FUNCTION update_report_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.lon, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update location in profiles table when coordinates change
CREATE OR REPLACE FUNCTION update_profile_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic location updates
CREATE TRIGGER update_reports_location_trigger
  BEFORE INSERT OR UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION update_report_location();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_location();

-- Function to get users within radius for notifications
CREATE OR REPLACE FUNCTION get_users_in_radius(
  report_lat DOUBLE PRECISION,
  report_lon DOUBLE PRECISION,
  radius_meters INTEGER
)
RETURNS TABLE (
  user_id UUID,
  phone TEXT,
  fcm_token TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.phone, p.fcm_token
  FROM public.profiles p
  WHERE p.location IS NOT NULL
    AND p.verified = true
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(report_lon, report_lat), 4326)::geography,
      radius_meters
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;