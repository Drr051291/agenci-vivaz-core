
-- Update RLS policies that still reference clients.user_id to use client_users junction table

-- payment_invoices: Clientes podem ver suas próprias notas fiscais
DROP POLICY IF EXISTS "Clientes podem ver suas próprias notas fiscais" ON public.payment_invoices;
CREATE POLICY "Clients can view their own invoices"
ON public.payment_invoices
FOR SELECT
USING (
  client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid())
  OR is_admin_or_collaborator(auth.uid())
);

-- asaas_customer_links: Clientes podem ver seus próprios vínculos Asaas
DROP POLICY IF EXISTS "Clientes podem ver seus próprios vínculos Asaas" ON public.asaas_customer_links;
CREATE POLICY "Clients can view their own asaas links"
ON public.asaas_customer_links
FOR SELECT
USING (
  client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid())
  OR is_admin_or_collaborator(auth.uid())
);

-- vivaz_metrics: Clientes podem ver suas próprias métricas Vivaz
DROP POLICY IF EXISTS "Clientes podem ver suas próprias métricas Vivaz" ON public.vivaz_metrics;
CREATE POLICY "Clients can view their own vivaz metrics"
ON public.vivaz_metrics
FOR SELECT
USING (
  client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid())
  OR is_admin_or_collaborator(auth.uid())
);

-- meeting_participants: Clientes podem ver participantes de suas reuniões
DROP POLICY IF EXISTS "Clientes podem ver participantes de suas reuniões" ON public.meeting_participants;
CREATE POLICY "Clients can view meeting participants"
ON public.meeting_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meeting_minutes mm
    WHERE mm.id = meeting_participants.meeting_id
    AND (
      mm.client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid())
      OR is_admin_or_collaborator(auth.uid())
    )
  )
);

-- meeting_files: Clientes podem ver arquivos de suas reuniões aprovadas
DROP POLICY IF EXISTS "Clientes podem ver arquivos de suas reuniões aprovadas" ON public.meeting_files;
CREATE POLICY "Clients can view meeting files"
ON public.meeting_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meeting_minutes mm
    WHERE mm.id = meeting_files.meeting_id
    AND (
      mm.client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid())
      OR is_admin_or_collaborator(auth.uid())
    )
  )
);

-- meeting_experiments: Clientes podem ver experimentos de suas reuniões aprovadas
DROP POLICY IF EXISTS "Clientes podem ver experimentos de suas reuniões aprovadas" ON public.meeting_experiments;
CREATE POLICY "Clients can view meeting experiments"
ON public.meeting_experiments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meeting_minutes mm
    WHERE mm.id = meeting_experiments.meeting_id
    AND (
      mm.client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid())
      OR is_admin_or_collaborator(auth.uid())
    )
  )
);

-- meeting_approval_items: Clientes podem ver itens de aprovação de suas reuniões aprovadas
DROP POLICY IF EXISTS "Clientes podem ver itens de aprovação de suas reuniões aprov" ON public.meeting_approval_items;
CREATE POLICY "Clients can view meeting approval items"
ON public.meeting_approval_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meeting_minutes mm
    WHERE mm.id = meeting_approval_items.meeting_id
    AND (
      mm.client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid())
      OR is_admin_or_collaborator(auth.uid())
    )
  )
);

-- meeting_channels: Clientes podem ver canais de suas reuniões aprovadas
DROP POLICY IF EXISTS "Clientes podem ver canais de suas reuniões aprovadas" ON public.meeting_channels;
-- Keep the existing "Clients can view their meeting channels" policy which already uses get_user_client_id

-- tasks: Update old policies that use clients.user_id
DROP POLICY IF EXISTS "Clientes podem atualizar status de suas tasks" ON public.tasks;
DROP POLICY IF EXISTS "Clientes podem ver suas próprias tasks" ON public.tasks;
-- Keep the newer policies that use get_user_client_id

-- task_comments: Update old policies that use clients.user_id
DROP POLICY IF EXISTS "Clientes podem inserir comentários em suas tasks" ON public.task_comments;
DROP POLICY IF EXISTS "Clientes podem ver comentários de suas tasks" ON public.task_comments;
-- Keep the newer policies that use get_user_client_id

-- performance_matrix_diagnostics: Update policy
DROP POLICY IF EXISTS "Clients can view their own diagnostics" ON public.performance_matrix_diagnostics;
CREATE POLICY "Clients can view their own diagnostics via client_users"
ON public.performance_matrix_diagnostics
FOR SELECT
USING (
  client_id IN (SELECT client_id FROM public.client_users WHERE user_id = auth.uid())
  OR is_admin_or_collaborator(auth.uid())
);
