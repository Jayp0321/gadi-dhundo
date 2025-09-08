-- Fix function search paths for security
CREATE OR REPLACE FUNCTION update_report_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.lon, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_profile_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create extensions schema and move PostGIS there
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION postgis SET SCHEMA extensions;