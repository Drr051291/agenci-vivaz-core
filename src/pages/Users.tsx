import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users as UsersIcon, Mail, Shield, Pencil, Trash2, Building2, Filter } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  phone: string | null;
  user_roles: { role: string }[];
  linked_client?: { id: string; company_name: string } | null;
}

interface Client {
  id: string;
  company_name: string;
  segment: string;
  user_id: string | null;
}

const Users = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [userToEdit, setUserToEdit] = useState<UserWithRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "client",
    client_id: "",
  });
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    role: "",
    client_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  usePageMeta({
    title: "Usuários",
    description: "Gerencie usuários do sistema, crie contas e defina permissões de acesso",
    keywords: "usuários, gestão de usuários, permissões, roles, vivaz",
  });

  useEffect(() => {
    checkAdminStatus();
    fetchUsers();
    fetchClients();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const fetchUsers = async () => {
    setLoading(true);
    
    // Fetch profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");

    if (profilesError) {
      toast({
        title: "Erro ao carregar usuários",
        description: profilesError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch user_roles separately
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role");

    // Fetch clients to map linked users
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, company_name, user_id");

    // Map roles and linked clients to users
    const usersWithData = (profilesData || []).map(user => {
      const userRoles = rolesData?.filter(r => r.user_id === user.id) || [];
      const linkedClient = clientsData?.find(c => c.user_id === user.id);
      return {
        ...user,
        user_roles: userRoles.map(r => ({ role: r.role })),
        linked_client: linkedClient ? { id: linkedClient.id, company_name: linkedClient.company_name } : null,
      };
    });

    setUsers(usersWithData as UserWithRole[]);
    setLoading(false);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, company_name, segment, user_id")
      .order("company_name");

    if (error) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setClients(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Validar se cliente foi selecionado quando role for client
    if (formData.role === "client" && !formData.client_id) {
      toast({
        title: "Cliente não selecionado",
        description: "Por favor, selecione um cliente para vincular o usuário.",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: formData.role,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Erro ao criar usuário - ID não retornado");
      }

      const userId = authData.user.id;

      // Aguardar trigger criar o perfil (polling com timeout)
      let profileCreated = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();
        
        if (profile) {
          profileCreated = true;
          break;
        }
      }

      if (!profileCreated) {
        // Se o trigger não criou, criar manualmente
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
          });
        
        if (profileError && !profileError.message.includes("duplicate")) {
          console.error("Erro ao criar perfil:", profileError);
        }
      }

      // Verificar/criar role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingRole) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ 
            user_id: userId, 
            role: formData.role as "admin" | "collaborator" | "client"
          });
        
        if (roleError && !roleError.message.includes("duplicate")) {
          console.error("Erro ao criar role:", roleError);
        }
      }

      // Se for cliente, vincular user_id ao cliente
      if (formData.role === "client" && formData.client_id) {
        const { error: clientError } = await supabase
          .from("clients")
          .update({ user_id: userId })
          .eq("id", formData.client_id);

        if (clientError) {
          throw clientError;
        }
      }

      toast({
        title: "Usuário criado!",
        description: "O usuário foi cadastrado com sucesso.",
      });
      
      setDialogOpen(false);
      setFormData({
        full_name: "",
        email: "",
        password: "",
        role: "client",
        client_id: "",
      });
      
      // Atualizar listas
      await fetchUsers();
      await fetchClients();
    } catch (error: any) {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (user: UserWithRole) => {
    const userRole = user.user_roles?.[0]?.role || user.role;
    setUserToEdit(user);
    setEditFormData({
      full_name: user.full_name,
      role: userRole,
      client_id: user.linked_client?.id || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    
    setSaving(true);

    // Validar se cliente foi selecionado quando role for client
    if (editFormData.role === "client" && !editFormData.client_id) {
      toast({
        title: "Cliente não selecionado",
        description: "Por favor, selecione um cliente para vincular o usuário.",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    try {
      // Atualizar perfil
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          full_name: editFormData.full_name,
          role: editFormData.role 
        })
        .eq("id", userToEdit.id);

      if (profileError) throw profileError;

      // Atualizar role na tabela user_roles
      const currentRole = userToEdit.user_roles?.[0]?.role;
      if (currentRole !== editFormData.role) {
        // Deletar role antiga e inserir nova
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userToEdit.id);

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: userToEdit.id, role: editFormData.role as any });

        if (roleError) throw roleError;
      }

      // Gerenciar vínculo com cliente
      const oldClientId = userToEdit.linked_client?.id;
      const newClientId = editFormData.client_id;

      // Se tinha vínculo e não tem mais, ou mudou de cliente
      if (oldClientId && oldClientId !== newClientId) {
        await supabase
          .from("clients")
          .update({ user_id: null })
          .eq("id", oldClientId);
      }

      // Se tem novo vínculo
      if (editFormData.role === "client" && newClientId) {
        const { error: clientError } = await supabase
          .from("clients")
          .update({ user_id: userToEdit.id })
          .eq("id", newClientId);

        if (clientError) throw clientError;
      } else if (editFormData.role !== "client" && oldClientId) {
        // Se mudou de cliente para outro role, remover vínculo
        await supabase
          .from("clients")
          .update({ user_id: null })
          .eq("id", oldClientId);
      }

      toast({
        title: "Usuário atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });

      setEditDialogOpen(false);
      setUserToEdit(null);
      fetchUsers();
      fetchClients();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    
    setDeleting(true);
    try {
      // Remover vínculo com cliente se existir
      if (userToDelete.linked_client) {
        await supabase
          .from("clients")
          .update({ user_id: null })
          .eq("id", userToDelete.linked_client.id);
      }

      // Remover role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userToDelete.id);

      // Remover perfil
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userToDelete.id);

      if (profileError) throw profileError;

      // Nota: O usuário em auth.users não pode ser deletado pelo client
      // Seria necessário uma edge function com service_role

      toast({
        title: "Usuário removido!",
        description: "O perfil do usuário foi removido do sistema.",
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
      fetchClients();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      collaborator: "Colaborador",
      client: "Cliente",
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === "admin") return "default";
    if (role === "collaborator") return "secondary";
    return "outline";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Filtrar usuários
  const filteredUsers = users.filter(user => {
    if (roleFilter === "all") return true;
    const userRole = user.user_roles?.[0]?.role || user.role;
    return userRole === roleFilter;
  });

  // Clientes disponíveis para vinculação (sem user_id ou é o cliente atual sendo editado)
  const getAvailableClients = (currentClientId?: string) => {
    return clients.filter(c => !c.user_id || c.id === currentClientId);
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Você não tem permissão para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground">Gerencie usuários do sistema</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Filtro por tipo */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="admin">Administradores</SelectItem>
                  <SelectItem value="collaborator">Colaboradores</SelectItem>
                  <SelectItem value="client">Clientes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Adicionar Usuário</DialogTitle>
                    <DialogDescription>
                      Crie uma nova conta de usuário no sistema
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo *</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData({ ...formData, full_name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        required
                        minLength={6}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Tipo de Usuário *</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) =>
                          setFormData({ ...formData, role: value, client_id: "" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">Cliente</SelectItem>
                          <SelectItem value="collaborator">Colaborador</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {formData.role === "client" && (
                      <div className="space-y-2">
                        <Label htmlFor="client_id">Cliente a Vincular *</Label>
                        <Select
                          value={formData.client_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, client_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableClients().map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.company_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {getAvailableClients().length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            Todos os clientes já possuem usuários vinculados.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Criando..." : "Criar Usuário"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {roleFilter === "all" 
                  ? "Nenhum usuário cadastrado ainda."
                  : `Nenhum ${getRoleLabel(roleFilter).toLowerCase()} encontrado.`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user) => {
              const userRole = user.user_roles?.[0]?.role || user.role;
              return (
                <Card
                  key={user.id}
                  className="border-border/50 hover:border-primary/50 transition-colors"
                >
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{user.full_name}</CardTitle>
                        <Badge
                          variant={getRoleBadgeVariant(userRole)}
                          className="mt-1"
                        >
                          {getRoleLabel(userRole)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(user)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteDialogOpen(true);
                          }}
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.linked_client && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{user.linked_client.company_name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog Editar */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Atualize as informações do usuário
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_full_name">Nome Completo *</Label>
                <Input
                  id="edit_full_name"
                  value={editFormData.full_name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, full_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={userToEdit?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_role">Tipo de Usuário *</Label>
                <Select
                  value={editFormData.role}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, role: value, client_id: value !== "client" ? "" : editFormData.client_id })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="collaborator">Colaborador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {editFormData.role === "client" && (
                <div className="space-y-2">
                  <Label htmlFor="edit_client_id">Cliente Vinculado *</Label>
                  <Select
                    value={editFormData.client_id}
                    onValueChange={(value) =>
                      setEditFormData({ ...editFormData, client_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableClients(userToEdit?.linked_client?.id).map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Excluir */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário "{userToDelete?.full_name}"?
              {userToDelete?.linked_client && (
                <span className="block mt-2 text-amber-600">
                  O vínculo com o cliente "{userToDelete.linked_client.company_name}" será removido.
                </span>
              )}
              <span className="block mt-2">
                Esta ação não pode ser desfeita.
              </span>
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
    </DashboardLayout>
  );
};

export default Users;