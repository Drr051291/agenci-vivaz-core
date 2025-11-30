import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Loader2 } from "lucide-react";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";

export const GoogleCalendarConnect = () => {
  const {
    isConnected,
    isCheckingConnection,
    connect,
    isConnecting,
    disconnect,
    isDisconnecting,
  } = useGoogleCalendar();

  if (isCheckingConnection) {
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
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Google Calendar</CardTitle>
            <CardDescription>
              {isConnected
                ? "Conectado à sua agenda do Google"
                : "Conecte sua agenda do Google para sincronizar reuniões"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Suas reuniões serão automaticamente sincronizadas com o Google Calendar.
            </p>
            <Button
              variant="outline"
              onClick={() => disconnect()}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Desconectando...
                </>
              ) : (
                "Desconectar"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Conecte sua conta do Google para importar eventos existentes e criar novos
              eventos com convites automáticos.
            </p>
            <Button
              onClick={() => connect()}
              disabled={isConnecting}
              className="w-full sm:w-auto"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Conectar Google Calendar
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
