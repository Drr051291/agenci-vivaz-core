import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ShareMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareToken: string;
  meetingTitle: string;
}

export function ShareMeetingDialog({
  open,
  onOpenChange,
  shareToken,
  meetingTitle,
}: ShareMeetingDialogProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/atas/${shareToken}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Erro ao copiar:", error);
      toast.error("Erro ao copiar link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Compartilhar Ata</DialogTitle>
          <DialogDescription>
            Compartilhe esta ata "{meetingTitle}" através do link público abaixo.
            Qualquer pessoa com este link poderá visualizar a ata sem precisar fazer login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="share-url">Link Público</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="share-url"
                value={shareUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <p className="font-semibold mb-1">ℹ️ Sobre o compartilhamento:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>O link é permanente e público</li>
              <li>Qualquer pessoa com o link pode visualizar a ata</li>
              <li>A ata pode ser baixada em PDF através do link</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}