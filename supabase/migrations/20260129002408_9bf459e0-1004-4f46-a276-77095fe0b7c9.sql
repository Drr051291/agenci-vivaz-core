
-- Drop the old RLS policy that relies on the deprecated user_id column
DROP POLICY IF EXISTS "Clientes podem ver seus próprios dados" ON public.clients;

-- Create new policy that uses the client_users junction table
CREATE POLICY "Clients can view their own data via client_users"
ON public.clients
FOR SELECT
USING (
  id IN (
    SELECT client_id FROM public.client_users WHERE user_id = auth.uid()
  )
  OR is_admin_or_collaborator(auth.uid())
);
