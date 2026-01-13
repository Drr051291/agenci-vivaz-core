import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckSquare, Calendar, MessageSquare, DollarSign, FileText } from "lucide-react";

interface Preferences {
  email_tasks: boolean;
  email_meetings: boolean;
  email_comments: boolean;
  email_payments: boolean;
  email_invoices: boolean;
}

const defaultPreferences: Preferences = {
  email_tasks: true,
  email_meetings: true,
  email_comments: true,
  email_payments: true,
  email_invoices: true,
};

const preferenceConfig = [
  {
    key: "email_tasks" as keyof Preferences,
    label: "Tarefas",
    description: "Novas tarefas atribuídas e atualizações",
    icon: CheckSquare,
  },
  {
    key: "email_meetings" as keyof Preferences,
    label: "Reuniões",
    description: "Novas reuniões agendadas e atualizações",
    icon: Calendar,
  },
  {
    key: "email_comments" as keyof Preferences,
    label: "Comentários",
    description: "Novos comentários em tarefas",
    icon: MessageSquare,
  },
  {
    key: "email_payments" as keyof Preferences,
    label: "Pagamentos",
    description: "Novos pagamentos registrados",
    icon: DollarSign,
  },
  {
    key: "email_invoices" as keyof Preferences,
    label: "Notas Fiscais",
    description: "Novas notas fiscais disponíveis",
    icon: FileText,
  },
];

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<keyof Preferences | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setPreferences({
          email_tasks: data.email_tasks,
          email_meetings: data.email_meetings,
          email_comments: data.email_comments,
          email_payments: data.email_payments,
          email_invoices: data.email_invoices,
        });
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof Preferences, value: boolean) => {
    setSaving(key);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: user.id,
            [key]: value,
            ...Object.fromEntries(
              Object.entries(preferences).filter(([k]) => k !== key)
            ),
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      setPreferences((prev) => ({ ...prev, [key]: value }));
      toast({
        title: "Preferências atualizadas",
        description: "Suas preferências de notificação foram salvas.",
      });
    } catch (error) {
      console.error("Error updating preference:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar suas preferências.",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferências de Email</CardTitle>
        <CardDescription>
          Configure quais notificações você deseja receber por email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {preferenceConfig.map((pref) => (
          <div
            key={pref.key}
            className="flex items-center justify-between py-2"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <pref.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <Label htmlFor={pref.key} className="font-medium cursor-pointer">
                  {pref.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {pref.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saving === pref.key && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              <Switch
                id={pref.key}
                checked={preferences[pref.key]}
                onCheckedChange={(checked) => updatePreference(pref.key, checked)}
                disabled={saving !== null}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
