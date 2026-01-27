-- Add policy to allow authenticated users to view and manage the system-created generator
-- This is for MVP where one generator is shared, later can be refined for multi-tenant

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own generators" ON public.geradores;
DROP POLICY IF EXISTS "Users can update their own generators" ON public.geradores;
DROP POLICY IF EXISTS "Users can delete their own generators" ON public.geradores;
DROP POLICY IF EXISTS "Users can insert their own generators" ON public.geradores;

-- Create new policies that allow access to user's own generators OR the system generator
CREATE POLICY "Users can view generators" 
ON public.geradores 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
);

CREATE POLICY "Users can update generators" 
ON public.geradores 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
);

CREATE POLICY "Users can insert their own generators" 
ON public.geradores 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generators" 
ON public.geradores 
FOR DELETE 
USING (auth.uid() = user_id);