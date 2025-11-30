import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, MessageSquare, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePageMeta } from "@/hooks/usePageMeta";

interface Message {
  id: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender: {
    full_name: string;
  };
  recipient: {
    full_name: string;
  };
}

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

const Messages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [formData, setFormData] = useState({
    recipient_id: "",
    subject: "",
    content: "",
  });
  const { toast } = useToast();

  usePageMeta({
    title: "Mensagens",
    description: "Envie e receba mensagens da equipe e clientes do HUB Vivaz",
    keywords: "mensagens, comunicação, chat, vivaz",
  });

  useEffect(() => {
    initializeData();

    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const initializeData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
    await Promise.all([fetchMessages(), fetchProfiles()]);
  };

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select(
        `
        *,
        sender:sender_id(full_name),
        recipient:recipient_id(full_name)
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar mensagens",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setMessages(data as any || []);
    }
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .order("full_name");

    if (error) {
      toast({
        title: "Erro ao carregar perfis",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProfiles(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("messages").insert([
      {
        ...formData,
        sender_id: currentUserId,
      },
    ]);

    if (error) {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Mensagem enviada!",
        description: "Sua mensagem foi enviada com sucesso.",
      });
      setDialogOpen(false);
      setFormData({
        recipient_id: "",
        subject: "",
        content: "",
      });
      fetchMessages();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mensagens</h1>
            <p className="text-muted-foreground">Comunicação com a equipe e clientes</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Mensagem
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Enviar Mensagem</DialogTitle>
                  <DialogDescription>
                    Envie uma mensagem para um membro da equipe ou cliente
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipient">Destinatário *</Label>
                    <Select
                      value={formData.recipient_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, recipient_id: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um destinatário" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles
                          .filter((p) => p.id !== currentUserId)
                          .map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Assunto *</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Mensagem *</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      rows={6}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Enviar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhuma mensagem ainda.
                <br />
                Clique em "Nova Mensagem" para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <Card
                key={message.id}
                className={`border-border/50 hover:border-primary/50 transition-colors ${
                  !message.is_read && message.recipient.full_name
                    ? "bg-muted/30"
                    : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {getInitials(message.sender.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{message.sender.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Para: {message.recipient.full_name}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(message.created_at)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-sm mb-1">{message.subject}</h3>
                        <p className="text-sm text-muted-foreground">{message.content}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Messages;
