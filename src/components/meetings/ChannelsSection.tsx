import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface Channel {
  id?: string;
  channel: string;
  investment: number;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
  notes?: string;
}

interface ChannelsSectionProps {
  channels: Channel[];
  onChange: (channels: Channel[]) => void;
  isEditing?: boolean;
}

const CHANNEL_OPTIONS = [
  { value: "meta_ads", label: "Meta Ads" },
  { value: "google_ads", label: "Google Ads" },
  { value: "tiktok_ads", label: "TikTok Ads" },
  { value: "linkedin_ads", label: "LinkedIn Ads" },
  { value: "organic_social", label: "Orgânico Social" },
  { value: "seo", label: "SEO/Orgânico" },
  { value: "email", label: "E-mail Marketing" },
  { value: "direct", label: "Tráfego Direto" },
  { value: "other", label: "Outro" },
];

export function ChannelsSection({ channels, onChange, isEditing = false }: ChannelsSectionProps) {
  const [localChannels, setLocalChannels] = useState<Channel[]>(channels);

  useEffect(() => {
    setLocalChannels(channels);
  }, [channels]);

  const handleChange = (index: number, field: keyof Channel, value: string | number) => {
    const updated = [...localChannels];
    if (field === "channel" || field === "notes") {
      updated[index] = { ...updated[index], [field]: value };
    } else {
      updated[index] = { ...updated[index], [field]: Number(value) || 0 };
    }
    setLocalChannels(updated);
    onChange(updated);
  };

  const addChannel = () => {
    const newChannel: Channel = {
      channel: "meta_ads",
      investment: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
      conversions: 0,
      revenue: 0,
    };
    const updated = [...localChannels, newChannel];
    setLocalChannels(updated);
    onChange(updated);
  };

  const removeChannel = (index: number) => {
    const updated = localChannels.filter((_, i) => i !== index);
    setLocalChannels(updated);
    onChange(updated);
  };

  const calculateMetrics = (channel: Channel) => {
    const cpl = channel.leads > 0 ? (channel.investment / channel.leads).toFixed(2) : null;
    const cpa = channel.conversions > 0 ? (channel.investment / channel.conversions).toFixed(2) : null;
    const roas = channel.investment > 0 ? (channel.revenue / channel.investment).toFixed(2) : null;
    return { cpl, cpa, roas };
  };

  const getChannelLabel = (value: string) => {
    return CHANNEL_OPTIONS.find(o => o.value === value)?.label || value;
  };

  if (!isEditing && localChannels.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Nenhum canal adicionado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {localChannels.map((channel, index) => {
        const calculated = calculateMetrics(channel);

        return (
          <div key={index} className="p-4 rounded-lg border bg-card space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              {isEditing ? (
                <Select
                  value={channel.channel}
                  onValueChange={(value) => handleChange(index, "channel", value)}
                >
                  <SelectTrigger className="w-48 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <h4 className="font-medium">{getChannelLabel(channel.channel)}</h4>
              )}
              {isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeChannel(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Investimento</label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={channel.investment || ""}
                    onChange={(e) => handleChange(index, "investment", e.target.value)}
                    className="h-8 mt-1"
                    placeholder="0"
                  />
                ) : (
                  <p className="text-sm font-medium mt-1">
                    R$ {channel.investment?.toLocaleString('pt-BR') || 0}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Leads</label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={channel.leads || ""}
                    onChange={(e) => handleChange(index, "leads", e.target.value)}
                    className="h-8 mt-1"
                    placeholder="0"
                  />
                ) : (
                  <p className="text-sm font-medium mt-1">{channel.leads || 0}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Conversões</label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={channel.conversions || ""}
                    onChange={(e) => handleChange(index, "conversions", e.target.value)}
                    className="h-8 mt-1"
                    placeholder="0"
                  />
                ) : (
                  <p className="text-sm font-medium mt-1">{channel.conversions || 0}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Receita</label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={channel.revenue || ""}
                    onChange={(e) => handleChange(index, "revenue", e.target.value)}
                    className="h-8 mt-1"
                    placeholder="0"
                  />
                ) : (
                  <p className="text-sm font-medium mt-1">
                    R$ {channel.revenue?.toLocaleString('pt-BR') || 0}
                  </p>
                )}
              </div>
            </div>

            {/* Calculated Metrics */}
            <div className="flex gap-4 pt-2 border-t">
              <div className="text-center">
                <span className="text-xs text-muted-foreground">CPL</span>
                <p className="text-sm font-medium">
                  {calculated.cpl ? `R$ ${calculated.cpl}` : "—"}
                </p>
              </div>
              <div className="text-center">
                <span className="text-xs text-muted-foreground">CPA</span>
                <p className="text-sm font-medium">
                  {calculated.cpa ? `R$ ${calculated.cpa}` : "—"}
                </p>
              </div>
              <div className="text-center">
                <span className="text-xs text-muted-foreground">ROAS</span>
                <p className="text-sm font-medium">
                  {calculated.roas ? `${calculated.roas}x` : "—"}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {isEditing && (
        <Button variant="outline" size="sm" onClick={addChannel} className="w-full">
          <Plus className="h-4 w-4 mr-1.5" />
          Adicionar canal
        </Button>
      )}
    </div>
  );
}
