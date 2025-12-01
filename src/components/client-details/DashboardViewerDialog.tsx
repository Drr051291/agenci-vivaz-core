import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from "lucide-react";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[99vw] w-[99vw] h-[99vh] p-0 gap-0 overflow-hidden border-0">
        <DialogHeader className="px-2 py-1 border-b flex-row items-center justify-between space-y-0 shrink-0 h-8 min-h-8">
          <div className="flex items-center gap-1 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>

            <DialogTitle className="text-xs font-medium truncate max-w-[250px]">
              {getDisplayName(currentDashboard.name, currentDashboard.dashboard_type)}
            </DialogTitle>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleNext}
              disabled={currentIndex === dashboards.length - 1}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>

            <span className="text-[10px] text-muted-foreground ml-1">
              {currentIndex + 1}/{dashboards.length}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIframeKey(prev => prev + 1)}
              title="Atualizar"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>

            {currentDashboard.embed_url && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
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
              className="h-6 w-6"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0">
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
      </DialogContent>
    </Dialog>
  );
}
