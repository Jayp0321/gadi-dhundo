-- Fix function search paths to address security warnings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_users_in_range(
  center_lat DOUBLE PRECISION,
  center_lon DOUBLE PRECISION,
  radius_meters INTEGER
) RETURNS TABLE (
  user_id UUID,
  distance_meters INTEGER,
  fcm_token TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    CAST(
      6371000 * acos(
        cos(radians(center_lat)) * 
        cos(radians(ST_Y(p.location::geometry))) * 
        cos(radians(ST_X(p.location::geometry)) - radians(center_lon)) + 
        sin(radians(center_lat)) * 
        sin(radians(ST_Y(p.location::geometry)))
      ) AS INTEGER
    ) as distance_meters,
    p.fcm_token
  FROM public.profiles p
  WHERE p.location IS NOT NULL
    AND p.user_id != auth.uid()
    AND 6371000 * acos(
      cos(radians(center_lat)) * 
      cos(radians(ST_Y(p.location::geometry))) * 
      cos(radians(ST_X(p.location::geometry)) - radians(center_lon)) + 
      sin(radians(center_lat)) * 
      sin(radians(ST_Y(p.location::geometry)))
    ) <= radius_meters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;