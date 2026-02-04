-- Fix security vulnerability: Add SELECT policy to profiles table
-- This prevents public access to user email addresses

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id OR has_admin_or_editor_role(auth.uid()));