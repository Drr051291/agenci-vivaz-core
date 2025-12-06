import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExternalLink, BarChart3, TrendingUp, Plus, Pencil, Trash2, Info, Eye, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardViewerDialog } from "./DashboardViewerDialog";

interface Dashboard {
  id: string;
  name: string;
  dashboard_type: string;
  embed_url?: string;
  is_active: boolean;
  created_at: string;
}

interface DashboardListProps {
  clientId: string;
  clientName?: string;
}

const PLATFORM_OPTIONS = [
  {
    value: "reportei",
    label: "Reportei",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: TrendingUp,
    placeholder: '<iframe title="report" src="https://app.reportei.com/embed/..." width="500" height="300"></iframe>',
    help: "Acesse seu relatório no Reportei → Clique em 'Incorporar' ou 'Embed' → Copie o código iframe completo",
    useTextarea: true,
  },
  {
    value: "pipedrive",
    label: "Pipedrive",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: BarChart3,
    placeholder: "https://suaempresa.pipedrive.com/insights/shared/...",
    help: "Acesse o Dashboard no Pipedrive → Clique em 'Compartilhar' → Copie o link de embed",
    useTextarea: false,
  },
];

// Extrai URL do atributo src de um iframe ou retorna a URL direta
const extractUrlFromIframe = (input: string): string => {
  const trimmed = input.trim();
  
  // Se já é uma URL válida, retorna direto
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  
  // Tenta extrair src do iframe
  const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
  if (srcMatch && srcMatch[1]) {
    return srcMatch[1].trim();
  }
  
  return trimmed;
};

export function DashboardList({ clientId, clientName }: DashboardListProps) {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  
  // Form state
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("reportei");
  const [formUrl, setFormUrl] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dashboardToDelete, setDashboardToDelete] = useState<Dashboard | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    fetchDashboards();
  }, [clientId]);

  // Trigger loading state when URL changes
  useEffect(() => {
    const url = extractUrlFromIframe(formUrl);
    const isValid = url.startsWith('http://') || url.startsWith('https://');
    if (isValid && formUrl.trim()) {
      setPreviewLoading(true);
      setPreviewKey(prev => prev + 1);
    }
  }, [formUrl]);

  const fetchDashboards = async () => {
    try {
      const { data, error } = await supabase
        .from("client_dashboards")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDashboards(data || []);
    } catch (error) {
      console.error("Erro ao buscar dashboards:", error);
      toast.error("Erro ao carregar dashboards");
    } finally {
      setLoading(false);
    }
  };

  const getPlatformInfo = (type: string) => {
    const platform = PLATFORM_OPTIONS.find(p => p.value === type || (type === "analytics" && p.value === "reportei"));
    return platform || PLATFORM_OPTIONS[0];
  };

  const getDisplayName = (dashboard: Dashboard) => {
    if (dashboard.name.startsWith("http://") || dashboard.name.startsWith("https://")) {
      const platform = getPlatformInfo(dashboard.dashboard_type);
      return `Dashboard ${platform.label}`;
    }
    return dashboard.name;
  };

  const handleViewDashboard = (dashboardId: string) => {
    setSelectedDashboardId(dashboardId);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingDashboard(null);
    setFormName("");
    setFormType("reportei");
    setFormUrl("");
    setFormDialogOpen(true);
  };

  const openEditDialog = (dashboard: Dashboard) => {
    setEditingDashboard(dashboard);
    setFormName(dashboard.name);
    setFormType(dashboard.dashboard_type === "analytics" ? "reportei" : dashboard.dashboard_type);
    setFormUrl(dashboard.embed_url || "");
    setFormDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Informe o nome do dashboard");
      return;
    }
    if (!formUrl.trim()) {
      toast.error("Informe a URL ou código de embed");
      return;
    }

    // Extrai URL se for iframe (para Reportei)
    const finalUrl = extractUrlFromIframe(formUrl);
    
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      toast.error("URL inválida. Verifique o código ou link informado.");
      return;
    }

    setSaving(true);
    try {
      if (editingDashboard) {
        // Update
        const { error } = await supabase
          .from("client_dashboards")
          .update({
            name: formName.trim(),
            dashboard_type: formType,
            embed_url: finalUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingDashboard.id);

        if (error) throw error;
        toast.success("Dashboard atualizado com sucesso");
      } else {
        // Create
        const { error } = await supabase
          .from("client_dashboards")
          .insert({
            client_id: clientId,
            name: formName.trim(),
            dashboard_type: formType,
            embed_url: finalUrl,
            is_active: true,
          });

        if (error) throw error;
        toast.success("Dashboard criado com sucesso");
      }

      setFormDialogOpen(false);
      fetchDashboards();
    } catch (error) {
      console.error("Erro ao salvar dashboard:", error);
      toast.error("Erro ao salvar dashboard");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!dashboardToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("client_dashboards")
        .update({ is_active: false })
        .eq("id", dashboardToDelete.id);

      if (error) throw error;
      toast.success("Dashboard excluído com sucesso");
      setDeleteDialogOpen(false);
      setDashboardToDelete(null);
      fetchDashboards();
    } catch (error) {
      console.error("Erro ao excluir dashboard:", error);
      toast.error("Erro ao excluir dashboard");
    } finally {
      setDeleting(false);
    }
  };

  const selectedPlatform = PLATFORM_OPTIONS.find(p => p.value === formType);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-250px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {/* Header com botão criar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Dashboards</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os dashboards do cliente (Reportei e Pipedrive)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Dashboard
          </Button>
        </div>
      </div>

      {dashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-350px)] gap-4">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum dashboard configurado</h3>
            <p className="text-muted-foreground mb-4">
              Adicione dashboards do Reportei ou Pipedrive para visualização.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Dashboard
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {dashboards.map((dashboard) => {
            const platform = getPlatformInfo(dashboard.dashboard_type);
            const Icon = platform.icon;

            return (
              <Card key={dashboard.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${platform.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-base">{getDisplayName(dashboard)}</h3>
                          <Badge className={`${platform.color} border text-xs mt-1`}>
                            {platform.label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleViewDashboard(dashboard.id)}
                        className="flex-1"
                      >
                        Visualizar
                      </Button>
                      {dashboard.embed_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          title="Abrir em Nova Aba"
                        >
                          <a
                            href={dashboard.embed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(dashboard)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDashboardToDelete(dashboard);
                          setDeleteDialogOpen(true);
                        }}
                        title="Excluir"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog Viewer */}
      {selectedDashboardId && (
        <DashboardViewerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          dashboards={dashboards}
          initialDashboardId={selectedDashboardId}
        />
      )}

      {/* Dialog Criar/Editar */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDashboard ? "Editar Dashboard" : "Novo Dashboard"}
            </DialogTitle>
            <DialogDescription>
              {editingDashboard 
                ? "Atualize as informações do dashboard."
                : "Adicione um novo dashboard do Reportei ou Pipedrive."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Dashboard *</Label>
              <Input
                id="name"
                placeholder="Ex: Dashboard de Vendas Mensal"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Plataforma *</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a plataforma" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((platform) => {
                    const Icon = platform.icon;
                    return (
                      <SelectItem key={platform.value} value={platform.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {platform.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">
                {selectedPlatform?.useTextarea ? "Código de Embed (iframe) *" : "URL de Embed *"}
              </Label>
              {selectedPlatform?.useTextarea ? (
                <Textarea
                  id="url"
                  placeholder={selectedPlatform?.placeholder}
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                />
              ) : (
                <Input
                  id="url"
                  placeholder={selectedPlatform?.placeholder}
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                />
              )}
              {selectedPlatform && (
                <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm">
                  <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">{selectedPlatform.help}</span>
                </div>
              )}
            </div>

            {/* Preview Section */}
            {formUrl.trim() && (() => {
              const previewUrl = extractUrlFromIframe(formUrl);
              const isValidUrl = previewUrl.startsWith('http://') || previewUrl.startsWith('https://');
              
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Preview
                    </Label>
                    <div className="flex items-center gap-2">
                      {previewLoading && (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Carregando...
                        </Badge>
                      )}
                      {isValidUrl ? (
                        <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/10">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          URL válida
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          URL inválida
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isValidUrl ? (
                    <div className="border rounded-lg overflow-hidden bg-muted/50 relative">
                      {previewLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Carregando preview...</span>
                          </div>
                        </div>
                      )}
                      <iframe
                        key={previewKey}
                        src={previewUrl}
                        className="w-full h-[250px]"
                        title="Preview do Dashboard"
                        sandbox="allow-scripts allow-same-origin"
                        onLoad={() => setPreviewLoading(false)}
                        onError={() => setPreviewLoading(false)}
                      />
                    </div>
                  ) : (
                    <div className="border rounded-lg p-8 bg-muted/50 text-center">
                      <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Cole o código iframe ou URL válida para visualizar o preview
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Excluir */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Dashboard</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o dashboard "{dashboardToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}