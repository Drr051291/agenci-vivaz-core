import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Link2, 
  FileText, 
  Trash2, 
  Upload, 
  Globe, 
  File,
  FileSpreadsheet,
  Presentation,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface KnowledgeEntry {
  id: string;
  source_type: string;
  source_name: string;
  source_reference: string | null;
  file_type: string | null;
  file_url: string | null;
  file_size: number | null;
  created_at: string;
  is_active: boolean | null;
}

interface VivazAIKnowledgeManagerProps {
  clientId: string;
}

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="h-4 w-4 text-red-500" />,
  xlsx: <FileSpreadsheet className="h-4 w-4 text-green-500" />,
  xls: <FileSpreadsheet className="h-4 w-4 text-green-500" />,
  csv: <FileSpreadsheet className="h-4 w-4 text-green-500" />,
  pptx: <Presentation className="h-4 w-4 text-orange-500" />,
  ppt: <Presentation className="h-4 w-4 text-orange-500" />,
  docx: <FileText className="h-4 w-4 text-blue-500" />,
  doc: <FileText className="h-4 w-4 text-blue-500" />,
  url: <Globe className="h-4 w-4 text-violet-500" />,
};

export function VivazAIKnowledgeManager({ clientId }: VivazAIKnowledgeManagerProps) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addType, setAddType] = useState<'url' | 'file'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [urlName, setUrlName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const { toast } = useToast();

  const fetchEntries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ai_knowledge_base')
        .select('id, source_type, source_name, source_reference, file_type, file_url, file_size, created_at, is_active')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;

    setIsAdding(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      // For now, we just save the URL reference
      // In production, you'd want to fetch and parse the content
      const { error } = await supabase
        .from('ai_knowledge_base')
        .insert({
          client_id: clientId,
          source_type: 'url',
          source_name: urlName || new URL(urlInput).hostname,
          source_reference: urlInput,
          content_text: `Referência: ${urlInput}`, // Placeholder
          added_by: userData.user?.id,
        });

      if (error) throw error;

      toast({
        title: 'URL adicionada',
        description: 'A referência foi adicionada à base de conhecimento.',
      });

      setUrlInput('');
      setUrlName('');
      setShowAddDialog(false);
      fetchEntries();
    } catch (error) {
      console.error('Error adding URL:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar a URL.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.ms-powerpoint',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Tipo de arquivo não suportado',
        description: 'Apenas PDF, Excel, PowerPoint, Word e CSV são permitidos.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo permitido é 50MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingFile(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      // Upload file to storage
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const fileName = `${clientId}/${Date.now()}-${file.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ai-knowledge-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('ai-knowledge-files')
        .getPublicUrl(fileName);

      // Save to knowledge base
      const { error: insertError } = await supabase
        .from('ai_knowledge_base')
        .insert({
          client_id: clientId,
          source_type: 'file',
          source_name: file.name,
          source_reference: fileName,
          file_type: fileExt,
          file_url: urlData.publicUrl,
          file_size: file.size,
          content_text: `Arquivo: ${file.name}`, // Will be parsed by edge function later
          added_by: userData.user?.id,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Arquivo enviado',
        description: 'O arquivo foi adicionado à base de conhecimento.',
      });

      setShowAddDialog(false);
      fetchEntries();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o arquivo.',
        variant: 'destructive',
      });
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  };

  const handleDeleteEntry = async (entry: KnowledgeEntry) => {
    try {
      // Delete file from storage if it exists
      if (entry.source_type === 'file' && entry.source_reference) {
        await supabase.storage
          .from('ai-knowledge-files')
          .remove([entry.source_reference]);
      }

      // Delete from database
      const { error } = await supabase
        .from('ai_knowledge_base')
        .delete()
        .eq('id', entry.id);

      if (error) throw error;

      setEntries(prev => prev.filter(e => e.id !== entry.id));
      toast({
        title: 'Item removido',
        description: 'O item foi removido da base de conhecimento.',
      });
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o item.',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getIcon = (entry: KnowledgeEntry) => {
    if (entry.source_type === 'url') {
      return FILE_TYPE_ICONS.url;
    }
    return FILE_TYPE_ICONS[entry.file_type || ''] || <File className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Base de Conhecimento</h3>
          <Badge variant="secondary" className="text-xs">
            {entries.length} itens
          </Badge>
        </div>
        <Button 
          onClick={() => setShowAddDialog(true)} 
          className="w-full gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Adicionar Fonte
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          <AnimatePresence>
            {entries.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-muted-foreground text-sm"
              >
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma fonte adicionada</p>
                <p className="text-xs">Adicione URLs ou arquivos</p>
              </motion.div>
            ) : (
              entries.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg",
                    "bg-muted/30 border border-border/50",
                    "hover:bg-muted/50 transition-colors group"
                  )}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                    {getIcon(entry)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {entry.source_name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{format(new Date(entry.created_at), "dd/MM/yy", { locale: ptBR })}</span>
                      {entry.file_size && (
                        <>
                          <span>·</span>
                          <span>{formatFileSize(entry.file_size)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => handleDeleteEntry(entry)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Fonte</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type Selector */}
            <div className="flex gap-2">
              <Button
                variant={addType === 'url' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setAddType('url')}
              >
                <Link2 className="h-4 w-4" />
                URL
              </Button>
              <Button
                variant={addType === 'file' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setAddType('file')}
              >
                <Upload className="h-4 w-4" />
                Arquivo
              </Button>
            </div>

            {addType === 'url' ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://exemplo.com/documento"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="name">Nome (opcional)</Label>
                  <Input
                    id="name"
                    placeholder="Nome da referência"
                    value={urlName}
                    onChange={(e) => setUrlName(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>Arquivo</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    PDF, Excel, PowerPoint, Word ou CSV (máx. 50MB)
                  </p>
                  <Input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv,.pptx,.ppt,.docx,.doc"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                  />
                </div>
                {uploadingFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando arquivo...
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            {addType === 'url' && (
              <Button onClick={handleAddUrl} disabled={!urlInput.trim() || isAdding}>
                {isAdding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Adicionar
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
