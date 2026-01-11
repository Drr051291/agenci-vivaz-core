
-- Create a helper function to get the client_id for the current user
-- This avoids recursion issues in RLS policies
CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clients WHERE user_id = _user_id LIMIT 1
$$;

-- Create a helper function to check if user is assigned to a task
CREATE OR REPLACE FUNCTION public.is_task_assignee(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE id = _task_id AND assigned_to = _user_id
  )
$$;

-- Update meeting_minutes RLS for clients to view their own meetings
DROP POLICY IF EXISTS "Clients can view their own meetings" ON public.meeting_minutes;
CREATE POLICY "Clients can view their own meetings"
ON public.meeting_minutes
FOR SELECT
TO authenticated
USING (
  client_id = get_user_client_id(auth.uid())
  OR is_admin_or_collaborator(auth.uid())
);

-- Update tasks RLS for clients - can view all tasks for their company
DROP POLICY IF EXISTS "Clients can view their company tasks" ON public.tasks;
CREATE POLICY "Clients can view their company tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  client_id = get_user_client_id(auth.uid())
  OR is_admin_or_collaborator(auth.uid())
);

-- Clients can only update tasks they are assigned to
DROP POLICY IF EXISTS "Clients can update assigned tasks" ON public.tasks;
CREATE POLICY "Clients can update assigned tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  (client_id = get_user_client_id(auth.uid()) AND assigned_to = auth.uid())
  OR is_admin_or_collaborator(auth.uid())
);

-- Update client_dashboards RLS for clients
DROP POLICY IF EXISTS "Clients can view their own dashboards" ON public.client_dashboards;
CREATE POLICY "Clients can view their own dashboards"
ON public.client_dashboards
FOR SELECT
TO authenticated
USING (
  client_id = get_user_client_id(auth.uid())
  OR is_admin_or_collaborator(auth.uid())
);

-- Update client_performance_entries RLS for clients (read-only)
DROP POLICY IF EXISTS "Clients can view their own performance entries" ON public.client_performance_entries;
CREATE POLICY "Clients can view their own performance entries"
ON public.client_performance_entries
FOR SELECT
TO authenticated
USING (
  client_id = get_user_client_id(auth.uid())
  OR is_admin_or_collaborator(auth.uid())
);

-- Update inside_sales_diagnostics RLS for clients (read-only)
DROP POLICY IF EXISTS "Clients can view their own diagnostics" ON public.inside_sales_diagnostics;
CREATE POLICY "Clients can view their own diagnostics"
ON public.inside_sales_diagnostics
FOR SELECT
TO authenticated
USING (
  client_id = get_user_client_id(auth.uid())
  OR is_admin_or_collaborator(auth.uid())
);

-- Task comments - clients can insert on any task in their company
DROP POLICY IF EXISTS "Clients can comment on company tasks" ON public.task_comments;
CREATE POLICY "Clients can comment on company tasks"
ON public.task_comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t 
    WHERE t.id = task_id 
    AND (t.client_id = get_user_client_id(auth.uid()) OR is_admin_or_collaborator(auth.uid()))
  )
  AND user_id = auth.uid()
);

-- Task comments - clients can view comments on their company tasks
DROP POLICY IF EXISTS "Clients can view comments on company tasks" ON public.task_comments;
CREATE POLICY "Clients can view comments on company tasks"
ON public.task_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t 
    WHERE t.id = task_id 
    AND (t.client_id = get_user_client_id(auth.uid()) OR is_admin_or_collaborator(auth.uid()))
  )
);

-- Meeting sections - clients can view their company meeting sections
DROP POLICY IF EXISTS "Clients can view their meeting sections" ON public.meeting_sections;
CREATE POLICY "Clients can view their meeting sections"
ON public.meeting_sections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meeting_minutes m 
    WHERE m.id = meeting_id 
    AND (m.client_id = get_user_client_id(auth.uid()) OR is_admin_or_collaborator(auth.uid()))
  )
);

-- Meeting metrics - clients can view their company meeting metrics
DROP POLICY IF EXISTS "Clients can view their meeting metrics" ON public.meeting_metrics;
CREATE POLICY "Clients can view their meeting metrics"
ON public.meeting_metrics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meeting_minutes m 
    WHERE m.id = meeting_id 
    AND (m.client_id = get_user_client_id(auth.uid()) OR is_admin_or_collaborator(auth.uid()))
  )
);

-- Meeting channels - clients can view their company meeting channels
DROP POLICY IF EXISTS "Clients can view their meeting channels" ON public.meeting_channels;
CREATE POLICY "Clients can view their meeting channels"
ON public.meeting_channels
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meeting_minutes m 
    WHERE m.id = meeting_id 
    AND (m.client_id = get_user_client_id(auth.uid()) OR is_admin_or_collaborator(auth.uid()))
  )
);
