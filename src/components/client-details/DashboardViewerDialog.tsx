import { useState, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Dashboard {
  id: string;
  name: string;
  dashboard_type: string;
  embed_url?: string;
}

interface DashboardViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboards: Dashboard[];
  initialDashboardId: string;
}

export function DashboardViewerDialog({
  open,
  onOpenChange,
  dashboards,
  initialDashboardId,
}: DashboardViewerDialogProps) {
  const [currentDashboardId, setCurrentDashboardId] = useState(initialDashboardId);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    setCurrentDashboardId(initialDashboardId);
  }, [initialDashboardId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentDashboardId, dashboards]);

  const currentIndex = dashboards.findIndex(d => d.id === currentDashboardId);
  const currentDashboard = dashboards[currentIndex];

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentDashboardId(dashboards[currentIndex - 1].id);
      setIframeKey(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < dashboards.length - 1) {
      setCurrentDashboardId(dashboards[currentIndex + 1].id);
      setIframeKey(prev => prev + 1);
    }
  };

  const getEmbedUrl = (url: string, type: string) => {
    if (type === "reportei" && url.includes("app.reportei.com")) {
      return url.replace("/dashboard/", "/public/");
    }
    return url;
  };

  if (!currentDashboard) return null;

  const getDisplayName = (name: string, type: string) => {
    if (name.startsWith("http://") || name.startsWith("https://")) {
      const platformName = type === "analytics" || type === "reportei" ? "Reportei" : 
                          type === "pipedrive" ? "Pipedrive" : type;
      return `Dashboard ${platformName}`;
    }
    return name;
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <DialogPrimitive.Content 
          className="fixed inset-0 z-50 flex flex-col bg-background"
          onEscapeKeyDown={() => onOpenChange(false)}
        >
          {/* Header minimalista */}
          <div className="flex items-center justify-between px-2 h-7 min-h-7 border-b bg-background shrink-0">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>

              <span className="text-xs font-medium truncate max-w-[200px]">
                {getDisplayName(currentDashboard.name, currentDashboard.dashboard_type)}
              </span>

              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleNext}
                disabled={currentIndex === dashboards.length - 1}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>

              <span className="text-[10px] text-muted-foreground">
                {currentIndex + 1}/{dashboards.length}
              </span>
            </div>

            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setIframeKey(prev => prev + 1)}
                title="Atualizar"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>

              {currentDashboard.embed_url && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  asChild
                  title="Abrir em Nova Aba"
                >
                  <a
                    href={currentDashboard.embed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Iframe fullscreen */}
          <div className="flex-1 w-full h-full">
            {currentDashboard.embed_url ? (
              <iframe
                key={iframeKey}
                src={getEmbedUrl(currentDashboard.embed_url, currentDashboard.dashboard_type)}
                className="w-full h-full border-0"
                title={currentDashboard.name}
                allow="fullscreen"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-muted/20">
                <p className="text-muted-foreground">Dashboard sem URL configurada</p>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
