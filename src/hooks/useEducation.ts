import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface EduCategory {
  id: string;
  name: string;
  scope: 'global' | 'client';
  client_id: string | null;
  created_at: string;
}

export interface EduTag {
  id: string;
  name: string;
  created_at: string;
}

export interface EduResource {
  id: string;
  title: string;
  description: string | null;
  type: 'training_recording' | 'youtube' | 'document' | 'external_link';
  url: string | null;
  file_path: string | null;
  category_id: string | null;
  scope: 'global' | 'client';
  client_id: string | null;
  duration_minutes: number | null;
  level: 'basico' | 'intermediario' | 'avancado' | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: EduCategory;
  tags?: EduTag[];
}

export interface SDRPlaybookSection {
  id: string;
  title: string;
  scope: 'global' | 'client';
  client_id: string | null;
  order_index: number;
  content_md: string | null;
  updated_at: string;
}

export interface SDRProcessStage {
  id: string;
  name: string;
  scope: 'global' | 'client';
  client_id: string | null;
  order_index: number;
  definition_md: string | null;
  entry_criteria_md: string | null;
  exit_criteria_md: string | null;
  checklist_json: { label: string; required: boolean; hints?: string }[];
  templates_json: { type: string; title: string; content: string }[];
  objections_json: { objection: string; response: string }[];
  updated_at: string;
}

export interface GlossaryTerm {
  id: string;
  key: string;
  scope: 'global' | 'client';
  client_id: string | null;
  definition_md: string | null;
  rules_md: string | null;
  updated_at: string;
}

export interface ResourceFilters {
  search: string;
  category_id: string | null;
  type: string | null;
  client_id: string | null;
  tags: string[];
  page: number;
  limit: number;
}

// Categories Hook
export function useCategories(clientId?: string) {
  return useQuery({
    queryKey: ['edu_categories', clientId],
    queryFn: async () => {
      let query = supabase.from('edu_categories').select('*').order('name');
      
      if (clientId) {
        query = query.or(`scope.eq.global,client_id.eq.${clientId}`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as EduCategory[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Tags Hook
export function useTags() {
  return useQuery({
    queryKey: ['edu_tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_tags')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as EduTag[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Resources Hook with pagination and filtering
export function useResources(filters: ResourceFilters, clientId?: string) {
  return useQuery({
    queryKey: ['edu_resources', filters, clientId],
    queryFn: async () => {
      const { search, category_id, type, client_id, tags, page, limit } = filters;
      const offset = (page - 1) * limit;
      
      let query = supabase
        .from('edu_resources')
        .select(`
          *,
          category:edu_categories(id, name)
        `, { count: 'exact' });
      
      // Scope filter
      if (clientId) {
        query = query.or(`scope.eq.global,client_id.eq.${clientId}`);
      } else if (client_id) {
        query = query.or(`scope.eq.global,client_id.eq.${client_id}`);
      }
      
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }
      
      if (category_id) {
        query = query.eq('category_id', category_id);
      }
      
      if (type) {
        query = query.eq('type', type);
      }
      
      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      // Fetch tags for each resource
      const resourceIds = data?.map(r => r.id) || [];
      let resourceTags: { resource_id: string; tag: EduTag }[] = [];
      
      if (resourceIds.length > 0) {
        const { data: tagsData } = await supabase
          .from('edu_resource_tags')
          .select('resource_id, tag:edu_tags(*)')
          .in('resource_id', resourceIds);
        resourceTags = tagsData as any || [];
      }
      
      const resourcesWithTags = data?.map(resource => ({
        ...resource,
        tags: resourceTags
          .filter(rt => rt.resource_id === resource.id)
          .map(rt => rt.tag)
      })) as EduResource[];
      
      // Filter by tags if specified
      let filteredResources = resourcesWithTags;
      if (tags.length > 0) {
        filteredResources = resourcesWithTags.filter(r => 
          r.tags?.some(t => tags.includes(t.id))
        );
      }
      
      return {
        resources: filteredResources,
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      };
    },
  });
}

// Create Resource Mutation
export function useCreateResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      resource: Omit<EduResource, 'id' | 'created_at' | 'updated_at' | 'category' | 'tags'>;
      tags: string[];
    }) => {
      const { data: resource, error } = await supabase
        .from('edu_resources')
        .insert(data.resource)
        .select()
        .single();
      
      if (error) throw error;
      
      // Add tags
      if (data.tags.length > 0) {
        const { error: tagsError } = await supabase
          .from('edu_resource_tags')
          .insert(data.tags.map(tag_id => ({ resource_id: resource.id, tag_id })));
        
        if (tagsError) throw tagsError;
      }
      
      return resource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edu_resources'] });
      toast.success('Recurso criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar recurso: ' + error.message);
    },
  });
}

// Playbook Sections Hook
export function usePlaybookSections(clientId?: string) {
  return useQuery({
    queryKey: ['sdr_playbook_sections', clientId],
    queryFn: async () => {
      // Get global and client-specific sections
      let query = supabase
        .from('sdr_playbook_sections')
        .select('*')
        .order('order_index');
      
      if (clientId) {
        query = query.or(`scope.eq.global,client_id.eq.${clientId}`);
      } else {
        query = query.eq('scope', 'global');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Merge client-specific overrides with global
      const sections = data as SDRPlaybookSection[];
      const merged = sections.reduce((acc, section) => {
        const existingIndex = acc.findIndex(s => s.title === section.title);
        if (existingIndex >= 0) {
          // Client-specific overrides global
          if (section.scope === 'client') {
            acc[existingIndex] = section;
          }
        } else {
          acc.push(section);
        }
        return acc;
      }, [] as SDRPlaybookSection[]);
      
      return merged.sort((a, b) => a.order_index - b.order_index);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Process Stages Hook
export function useProcessStages(clientId?: string) {
  return useQuery({
    queryKey: ['sdr_process_stages', clientId],
    queryFn: async () => {
      let query = supabase
        .from('sdr_process_stages')
        .select('*')
        .order('order_index');
      
      if (clientId) {
        query = query.or(`scope.eq.global,client_id.eq.${clientId}`);
      } else {
        query = query.eq('scope', 'global');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Parse JSONB fields and merge client-specific
      const stages = (data || []).map(stage => ({
        ...stage,
        checklist_json: stage.checklist_json || [],
        templates_json: stage.templates_json || [],
        objections_json: stage.objections_json || [],
      })) as SDRProcessStage[];
      
      // Merge client-specific with global
      const merged = stages.reduce((acc, stage) => {
        const existingIndex = acc.findIndex(s => s.name === stage.name);
        if (existingIndex >= 0) {
          if (stage.scope === 'client') {
            acc[existingIndex] = stage;
          }
        } else {
          acc.push(stage);
        }
        return acc;
      }, [] as SDRProcessStage[]);
      
      return merged.sort((a, b) => a.order_index - b.order_index);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Glossary Hook
export function useGlossary(clientId?: string) {
  return useQuery({
    queryKey: ['glossary_terms', clientId],
    queryFn: async () => {
      let query = supabase
        .from('glossary_terms')
        .select('*')
        .order('key');
      
      if (clientId) {
        query = query.or(`scope.eq.global,client_id.eq.${clientId}`);
      } else {
        query = query.eq('scope', 'global');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Merge client-specific with global
      const terms = data as GlossaryTerm[];
      const merged = terms.reduce((acc, term) => {
        const existingIndex = acc.findIndex(t => t.key === term.key);
        if (existingIndex >= 0) {
          if (term.scope === 'client') {
            acc[existingIndex] = term;
          }
        } else {
          acc.push(term);
        }
        return acc;
      }, [] as GlossaryTerm[]);
      
      return merged;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Update section mutation
export function useUpdatePlaybookSection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<SDRPlaybookSection> & { id: string }) => {
      const { error } = await supabase
        .from('sdr_playbook_sections')
        .update(data)
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr_playbook_sections'] });
      toast.success('Seção atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}

// Update stage mutation
export function useUpdateProcessStage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<SDRProcessStage> & { id: string }) => {
      const { error } = await supabase
        .from('sdr_process_stages')
        .update(data)
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr_process_stages'] });
      toast.success('Etapa atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}

// Check if user can edit
export function useCanEditEducation() {
  const [canEdit, setCanEdit] = useState(false);
  
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      setCanEdit(data?.role === 'admin' || data?.role === 'collaborator');
    };
    
    check();
  }, []);
  
  return canEdit;
}
