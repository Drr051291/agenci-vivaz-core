-- Add policy to allow admins to delete profiles
CREATE POLICY "Admins podem deletar perfis" 
ON public.profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));