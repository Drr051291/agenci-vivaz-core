-- Adicionar policies para acesso público via compartilhamento

-- meeting_sections: Permitir SELECT público quando a reunião pai tiver share_token ou slug
CREATE POLICY "Seções podem ser vistas publicamente via compartilhamento"
ON public.meeting_sections
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meeting_minutes mm
    WHERE mm.id = meeting_sections.meeting_id
    AND (mm.share_token IS NOT NULL OR mm.slug IS NOT NULL)
  )
);

-- meeting_metrics: Permitir SELECT público quando a reunião pai tiver share_token ou slug
CREATE POLICY "Métricas podem ser vistas publicamente via compartilhamento"
ON public.meeting_metrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meeting_minutes mm
    WHERE mm.id = meeting_metrics.meeting_id
    AND (mm.share_token IS NOT NULL OR mm.slug IS NOT NULL)
  )
);

-- meeting_channels: Permitir SELECT público quando a reunião pai tiver share_token ou slug
CREATE POLICY "Canais podem ser vistos publicamente via compartilhamento"
ON public.meeting_channels
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meeting_minutes mm
    WHERE mm.id = meeting_channels.meeting_id
    AND (mm.share_token IS NOT NULL OR mm.slug IS NOT NULL)
  )
);