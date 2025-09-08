-- Function to automatically create or update user profile on sign in
CREATE OR REPLACE FUNCTION public.handle_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY definer SET search_path = public
AS $$
BEGIN
  -- Insert or update profile for the user
  INSERT INTO public.profiles (user_id, name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    now(),
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    updated_at = now(),
    name = COALESCE(EXCLUDED.name, profiles.name);
  
  RETURN NEW;
END;
$$;

-- Create trigger to run on auth.users insert or update
DROP TRIGGER IF EXISTS on_auth_user_profile ON auth.users;
CREATE TRIGGER on_auth_user_profile
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_profile();