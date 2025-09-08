-- Make phone column nullable since we're not using phone authentication anymore
ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;

-- Update profiles table to have default values for better user experience
ALTER TABLE public.profiles ALTER COLUMN phone SET DEFAULT NULL;