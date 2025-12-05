import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GoogleCalendarCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processando autenticação...");

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      console.log('Callback URL params:', { code: code?.substring(0, 10) + '...', error });

      if (error) {
        console.error('OAuth error:', error);
        setStatus("error");
        setMessage(`Autorização negada: ${error}`);
        return;
      }

      if (!code) {
        console.error('No authorization code received');
        setStatus("error");
        setMessage("Código de autorização não encontrado. Verifique as configurações do Google Cloud Console.");
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus("error");
          setMessage("Sessão não encontrada. Faça login novamente.");
          return;
        }

        // Call edge function to exchange code for tokens
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=callback`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Edge function error:', errorData);
          throw new Error(errorData.error || "Failed to process callback");
        }

        const data = await response.json();
        console.log('Callback response:', data);

        if (data.success) {
          setStatus("success");
          setMessage("Google Calendar conectado com sucesso!");
          setTimeout(() => {
            navigate("/dashboard");
          }, 2000);
        } else {
          throw new Error(data.error || "Falha ao processar autenticação");
        }
      } catch (error) {
        console.error("Callback error:", error);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Erro ao conectar Google Calendar");
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {status === "loading" && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h2 className="text-xl font-semibold">{message}</h2>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <h2 className="text-xl font-semibold text-green-600">{message}</h2>
                <p className="text-sm text-muted-foreground">
                  Redirecionando para o dashboard...
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="h-12 w-12 text-destructive" />
                <h2 className="text-xl font-semibold text-destructive">{message}</h2>
                <Button onClick={() => navigate("/dashboard")} className="mt-4">
                  Voltar para o Dashboard
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}