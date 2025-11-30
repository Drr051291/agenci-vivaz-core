-- Adicionar campos para dashboards e tasks vinculados nas reuniões
ALTER TABLE meeting_minutes 
ADD COLUMN IF NOT EXISTS linked_dashboards UUID[],
ADD COLUMN IF NOT EXISTS linked_tasks UUID[];

-- Comentários explicativos
COMMENT ON COLUMN meeting_minutes.linked_dashboards IS 'IDs dos dashboards vinculados à reunião';
COMMENT ON COLUMN meeting_minutes.linked_tasks IS 'IDs das tasks/atividades vinculadas à reunião';