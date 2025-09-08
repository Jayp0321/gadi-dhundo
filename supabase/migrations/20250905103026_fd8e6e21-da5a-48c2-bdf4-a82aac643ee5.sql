-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create notification_alerts table for real-time alerts
CREATE TABLE public.notification_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL,
  recipient_user_id UUID NOT NULL,
  sender_user_id UUID NOT NULL,
  message TEXT NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'theft_alert',
  distance_meters INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for notification alerts
CREATE POLICY "Users can view alerts sent to them" 
ON public.notification_alerts 
FOR SELECT 
USING (auth.uid() = recipient_user_id);

CREATE POLICY "Users can create alerts for their reports" 
ON public.notification_alerts 
FOR INSERT 
WITH CHECK (auth.uid() = sender_user_id);

CREATE POLICY "Users can update their received alerts" 
ON public.notification_alerts 
FOR UPDATE 
USING (auth.uid() = recipient_user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_notification_alerts_updated_at
BEFORE UPDATE ON public.notification_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notification_alerts
ALTER TABLE public.notification_alerts REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.notification_alerts;

-- Enable realtime for reports table too  
ALTER TABLE public.reports REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.reports;

-- Create function to calculate users in range
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
$$ LANGUAGE plpgsql SECURITY DEFINER;