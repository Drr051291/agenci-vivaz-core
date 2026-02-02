import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Video,
  FileText,
  Link as LinkIcon,
  Youtube,
  Clock,
  Download,
  ExternalLink,
  Copy,
  X,
  Filter,
} from 'lucide-react';
import { useResources, useCategories, useTags, useCreateResource, useCanEditEducation, ResourceFilters, EduResource } from '@/hooks/useEducation';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface BibliotecaTabProps {
  clientId?: string;
  clientName?: string;
  allowClientUpload?: boolean;
}

const TYPE_ICONS = {
  training_recording: Video,
  youtube: Youtube,
  document: FileText,
  external_link: LinkIcon,
};

const TYPE_LABELS = {
  training_recording: 'Gravação',
  youtube: 'YouTube',
  document: 'Documento',
  external_link: 'Link Externo',
};

const LEVEL_LABELS = {
  basico: 'Básico',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
};

function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useMemo(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function BibliotecaTab({ clientId, clientName, allowClientUpload = false }: BibliotecaTabProps) {
  const canEditHook = useCanEditEducation();
  // If allowClientUpload is true, clients can also add resources
  const canEdit = canEditHook || allowClientUpload;
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounceValue(searchInput, 400);
  
  const [filters, setFilters] = useState<ResourceFilters>({
    search: '',
    category_id: null,
    type: null,
    client_id: clientId || null,
    tags: [],
    page: 1,
    limit: 12,
  });

  const effectiveFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch,
  }), [filters, debouncedSearch]);

  const { data: categories } = useCategories(clientId);
  const { data: tags } = useTags();
  const { data: resourcesData, isLoading, error, refetch } = useResources(effectiveFilters, clientId);
  
  const [selectedResource, setSelectedResource] = useState<EduResource | null>(null);
  const [showNewResourceDialog, setShowNewResourceDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = useCallback((key: keyof ResourceFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      category_id: null,
      type: null,
      client_id: clientId || null,
      tags: [],
      page: 1,
      limit: 12,
    });
    setSearchInput('');
  }, [clientId]);

  const hasActiveFilters = filters.category_id || filters.type || filters.tags.length > 0;

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, tag ou descrição…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={hasActiveFilters ? "secondary" : "outline"}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
          {canEdit && (
            <Dialog open={showNewResourceDialog} onOpenChange={setShowNewResourceDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Novo recurso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Novo Recurso</DialogTitle>
                </DialogHeader>
                <NewResourceForm
                  categories={categories || []}
                  tags={tags || []}
                  clientId={clientId}
                  onSuccess={() => {
                    setShowNewResourceDialog(false);
                    refetch();
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters Row */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
            <Select
              value={filters.category_id || 'all'}
              onValueChange={(v) => handleFilterChange('category_id', v === 'all' ? null : v)}
            >
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories?.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.type || 'all'}
              onValueChange={(v) => handleFilterChange('type', v === 'all' ? null : v)}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                <X className="h-3 w-3 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Erro ao carregar recursos. Tentar novamente.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : !resourcesData?.resources.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum recurso encontrado com os filtros atuais.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resourcesData.resources.map(resource => {
              const TypeIcon = TYPE_ICONS[resource.type];
              return (
                <Card
                  key={resource.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedResource(resource)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <TypeIcon className="h-4 w-4 text-primary" />
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {TYPE_LABELS[resource.type]}
                        </Badge>
                      </div>
                      {resource.scope === 'client' && (
                        <Badge variant="secondary" className="text-[10px]">
                          Cliente
                        </Badge>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm line-clamp-2">{resource.title}</h3>
                      {resource.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {resource.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{resource.category?.name || 'Sem categoria'}</span>
                      {resource.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {resource.duration_minutes} min
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {resourcesData.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => handleFilterChange('page', filters.page - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground py-2">
                Página {resourcesData.page} de {resourcesData.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page >= resourcesData.totalPages}
                onClick={() => handleFilterChange('page', filters.page + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}

      {/* Resource Detail Dialog */}
      <Dialog open={!!selectedResource} onOpenChange={() => setSelectedResource(null)}>
        <DialogContent className="max-w-2xl">
          {selectedResource && (
            <ResourceDetail resource={selectedResource} onClose={() => setSelectedResource(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Resource Detail Component
function ResourceDetail({ resource, onClose }: { resource: EduResource; onClose: () => void }) {
  const TypeIcon = TYPE_ICONS[resource.type];
  
  const handleCopyLink = () => {
    const url = resource.url || window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : null;
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <TypeIcon className="h-5 w-5 text-primary" />
          </div>
          <Badge variant="outline">{TYPE_LABELS[resource.type]}</Badge>
          {resource.level && (
            <Badge variant="secondary">{LEVEL_LABELS[resource.level]}</Badge>
          )}
        </div>
        <DialogTitle className="text-lg mt-2">{resource.title}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {resource.description && (
          <p className="text-sm text-muted-foreground">{resource.description}</p>
        )}

        {/* Embed YouTube */}
        {resource.type === 'youtube' && resource.url && (
          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
            <iframe
              src={getYouTubeEmbedUrl(resource.url) || ''}
              className="w-full h-full"
              allowFullScreen
              title={resource.title}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {resource.type === 'document' && resource.file_path && (
            <Button size="sm" onClick={async () => {
              const { data } = await supabase.storage
                .from('edu-documents')
                .createSignedUrl(resource.file_path!, 3600);
              if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
              }
            }}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          )}
          {(resource.type === 'external_link' || resource.type === 'training_recording') && resource.url && (
            <Button size="sm" onClick={() => window.open(resource.url!, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Abrir
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <Copy className="h-4 w-4 mr-1" />
            Copiar link
          </Button>
        </div>

        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t">
            {resource.tags.map(tag => (
              <Badge key={tag.id} variant="outline" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          {resource.category && <span>Categoria: {resource.category.name}</span>}
          {resource.duration_minutes && <span>Duração: {resource.duration_minutes} min</span>}
        </div>
      </div>
    </>
  );
}

// New Resource Form
function NewResourceForm({
  categories,
  tags,
  clientId,
  onSuccess,
}: {
  categories: any[];
  tags: any[];
  clientId?: string;
  onSuccess: () => void;
}) {
  const createResource = useCreateResource();
  const [form, setForm] = useState<{
    title: string;
    description: string;
    type: 'training_recording' | 'youtube' | 'document' | 'external_link';
    url: string;
    category_id: string;
    scope: string;
    client_id: string | null;
    duration_minutes: string;
    level: string;
    selectedTags: string[];
  }>({
    title: '',
    description: '',
    type: 'youtube',
    url: '',
    category_id: '',
    scope: clientId ? 'client' : 'global',
    client_id: clientId || null,
    duration_minutes: '',
    level: '',
    selectedTags: [],
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let file_path = null;
    
    if (form.type === 'document' && file) {
      setUploading(true);
      const filePath = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('edu-documents')
        .upload(filePath, file);
      
      if (error) {
        toast.error('Erro ao fazer upload: ' + error.message);
        setUploading(false);
        return;
      }
      file_path = filePath;
      setUploading(false);
    }

    const { data: { user } } = await supabase.auth.getUser();

    createResource.mutate({
      resource: {
        title: form.title,
        description: form.description || null,
        type: form.type,
        url: form.url || null,
        file_path,
        category_id: form.category_id || null,
        scope: form.scope as 'global' | 'client',
        client_id: form.scope === 'client' ? form.client_id : null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        level: form.level as any || null,
        created_by: user?.id || null,
      },
      tags: form.selectedTags,
    }, { onSuccess });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo *</Label>
          <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as any }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={form.category_id} onValueChange={(v) => setForm(f => ({ ...f, category_id: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {form.type === 'document' ? (
        <div className="space-y-2">
          <Label>Arquivo</Label>
          <Input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            type="url"
            value={form.url}
            onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))}
            placeholder="https://..."
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Duração (min)</Label>
          <Input
            type="number"
            value={form.duration_minutes}
            onChange={(e) => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Nível</Label>
          <Select value={form.level} onValueChange={(v) => setForm(f => ({ ...f, level: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LEVEL_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={createResource.isPending || uploading}>
        {(createResource.isPending || uploading) ? 'Salvando...' : 'Criar Recurso'}
      </Button>
    </form>
  );
}
