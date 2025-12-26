import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Channel {
  channel: string;
  investment: number;
  leads: number;
  conversions: number;
  revenue: number;
  what_worked?: string;
  what_to_adjust?: string;
}

interface ChannelPerformanceSectionProps {
  channels: Channel[];
  onChange: (channels: Channel[]) => void;
  isEditing?: boolean;
}

const CHANNEL_OPTIONS = [
  { value: "meta_ads", label: "Meta Ads" },
  { value: "google_ads", label: "Google Ads" },
  { value: "tiktok_ads", label: "TikTok Ads" },
  { value: "linkedin_ads", label: "LinkedIn Ads" },
  { value: "seo", label: "SEO" },
  { value: "email", label: "E-mail" },
  { value: "organico_social", label: "Orgânico Social" },
  { value: "direto", label: "Direto" },
  { value: "outros", label: "Outros" },
];

export function ChannelPerformanceSection({ channels, onChange, isEditing = false }: ChannelPerformanceSectionProps) {
  const [localChannels, setLocalChannels] = useState<Channel[]>(channels);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLocalChannels(channels);
  }, [channels]);

  const handleChange = (index: number, field: keyof Channel, value: string | number) => {
    const updated = [...localChannels];
    if (field === "channel" || field === "what_worked" || field === "what_to_adjust") {
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

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const calculateMetrics = (channel: Channel) => {
    const cpl = channel.leads > 0 ? (channel.investment / channel.leads) : null;
    const cpa = channel.conversions > 0 ? (channel.investment / channel.conversions) : null;
    const roas = channel.investment > 0 ? (channel.revenue / channel.investment) : null;
    return { cpl, cpa, roas };
  };

  const getChannelLabel = (value: string) => {
    return CHANNEL_OPTIONS.find(o => o.value === value)?.label || value;
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (!isEditing && localChannels.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Nenhum canal adicionado</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-muted/50 rounded-t-lg text-xs font-medium text-muted-foreground">
        <div className="col-span-2">Canal</div>
        <div className="col-span-1 text-right">Invest.</div>
        <div className="col-span-1 text-right">Leads</div>
        <div className="col-span-1 text-right">CPL</div>
        <div className="col-span-1 text-right">Conv.</div>
        <div className="col-span-1 text-right">CPA</div>
        <div className="col-span-2 text-right">Receita</div>
        <div className="col-span-1 text-right">ROAS</div>
        {isEditing && <div className="col-span-1"></div>}
      </div>

      {/* Rows */}
      <div className="space-y-1">
        {localChannels.map((channel, index) => {
          const calculated = calculateMetrics(channel);
          const isExpanded = expandedRows.has(index);
          const hasDetails = channel.what_worked || channel.what_to_adjust;

          return (
            <div key={index} className="rounded-lg border bg-card overflow-hidden">
              {/* Main Row */}
              <div className="grid grid-cols-12 gap-1 px-3 py-2 items-center text-sm">
                <div className="col-span-2 flex items-center gap-1">
                  {(isEditing || hasDetails) && (
                    <button
                      onClick={() => toggleExpanded(index)}
                      className="p-0.5 hover:bg-muted rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  )}
                  {isEditing ? (
                    <Select
                      value={channel.channel}
                      onValueChange={(value) => handleChange(index, "channel", value)}
                    >
                      <SelectTrigger className="h-7 text-xs border-0 bg-transparent px-1">
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
                    <span className="font-medium text-xs">{getChannelLabel(channel.channel)}</span>
                  )}
                </div>

                {/* Investment */}
                <div className="col-span-1 text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={channel.investment || ""}
                      onChange={(e) => handleChange(index, "investment", e.target.value)}
                      className="h-7 text-xs text-right"
                      placeholder="0"
                    />
                  ) : (
                    <span className="text-xs">{formatCurrency(channel.investment)}</span>
                  )}
                </div>

                {/* Leads */}
                <div className="col-span-1 text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={channel.leads || ""}
                      onChange={(e) => handleChange(index, "leads", e.target.value)}
                      className="h-7 text-xs text-right"
                      placeholder="0"
                    />
                  ) : (
                    <span className="text-xs">{channel.leads || "—"}</span>
                  )}
                </div>

                {/* CPL (calculated) */}
                <div className="col-span-1 text-right">
                  <span className="text-xs text-muted-foreground">
                    {calculated.cpl ? formatCurrency(calculated.cpl) : "—"}
                  </span>
                </div>

                {/* Conversions */}
                <div className="col-span-1 text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={channel.conversions || ""}
                      onChange={(e) => handleChange(index, "conversions", e.target.value)}
                      className="h-7 text-xs text-right"
                      placeholder="0"
                    />
                  ) : (
                    <span className="text-xs">{channel.conversions || "—"}</span>
                  )}
                </div>

                {/* CPA (calculated) */}
                <div className="col-span-1 text-right">
                  <span className="text-xs text-muted-foreground">
                    {calculated.cpa ? formatCurrency(calculated.cpa) : "—"}
                  </span>
                </div>

                {/* Revenue */}
                <div className="col-span-2 text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={channel.revenue || ""}
                      onChange={(e) => handleChange(index, "revenue", e.target.value)}
                      className="h-7 text-xs text-right"
                      placeholder="0"
                    />
                  ) : (
                    <span className="text-xs font-medium">{formatCurrency(channel.revenue)}</span>
                  )}
                </div>

                {/* ROAS (calculated) */}
                <div className="col-span-1 text-right">
                  <span className={cn(
                    "text-xs font-medium",
                    calculated.roas && calculated.roas >= 3 && "text-emerald-600",
                    calculated.roas && calculated.roas < 1 && "text-red-600"
                  )}>
                    {calculated.roas ? `${calculated.roas.toFixed(2)}x` : "—"}
                  </span>
                </div>

                {/* Actions */}
                {isEditing && (
                  <div className="col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeChannel(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-3 py-3 border-t bg-muted/30 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-emerald-700 mb-1 block">O que funcionou</label>
                      {isEditing ? (
                        <Textarea
                          value={channel.what_worked || ""}
                          onChange={(e) => handleChange(index, "what_worked", e.target.value)}
                          placeholder="Ex: Criativos de vídeo tiveram CTR 2x maior..."
                          className="min-h-[60px] text-sm"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {channel.what_worked || <span className="italic">Não informado</span>}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-amber-700 mb-1 block">O que ajustar</label>
                      {isEditing ? (
                        <Textarea
                          value={channel.what_to_adjust || ""}
                          onChange={(e) => handleChange(index, "what_to_adjust", e.target.value)}
                          placeholder="Ex: Reduzir investimento em públicos frios..."
                          className="min-h-[60px] text-sm"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {channel.what_to_adjust || <span className="italic">Não informado</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Channel */}
      {isEditing && (
        <Button
          variant="outline"
          size="sm"
          onClick={addChannel}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Adicionar canal
        </Button>
      )}
    </div>
  );
}
