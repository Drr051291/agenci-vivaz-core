import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Users, User, Calendar as CalendarIcon, Hash, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { MeetingStatusBadge } from "../MeetingStatusBadge";

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface MeetingHeaderV2Props {
  meetingDate: string;
  participants: string[];
  responsible: string;
  analysisPeriodStart: string;
  analysisPeriodEnd: string;
  focusChannels: string[];
  status: string;
  profiles: Profile[];
  onChange: (data: {
    meetingDate?: string;
    participants?: string[];
    responsible?: string;
    analysisPeriodStart?: string;
    analysisPeriodEnd?: string;
    focusChannels?: string[];
  }) => void;
  isEditing?: boolean;
}

const CHANNEL_OPTIONS = [
  "Meta Ads",
  "Google Ads",
  "TikTok Ads",
  "SEO",
  "E-mail",
  "Orgânico Social",
  "Direto",
  "Outros",
];

export function MeetingHeaderV2({
  meetingDate,
  participants,
  responsible,
  analysisPeriodStart,
  analysisPeriodEnd,
  focusChannels,
  status,
  profiles,
  onChange,
  isEditing = false,
}: MeetingHeaderV2Props) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [periodStartOpen, setPeriodStartOpen] = useState(false);
  const [periodEndOpen, setPeriodEndOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);

  const toggleChannel = (channel: string) => {
    const updated = focusChannels.includes(channel)
      ? focusChannels.filter(c => c !== channel)
      : [...focusChannels, channel];
    onChange({ focusChannels: updated });
  };

  const toggleParticipant = (name: string) => {
    const updated = participants.includes(name)
      ? participants.filter(p => p !== name)
      : [...participants, name];
    onChange({ participants: updated });
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-medium gap-1.5 bg-primary/5 text-primary border-primary/20">
            v2
          </Badge>
          <span className="text-sm font-medium text-muted-foreground">Reunião de Performance</span>
        </div>
        <MeetingStatusBadge status={status} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Data da reunião */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            Data da reunião
          </label>
          {isEditing ? (
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start h-9 text-sm font-normal",
                    !meetingDate && "text-muted-foreground"
                  )}
                >
                  {meetingDate 
                    ? format(new Date(meetingDate), "dd/MM/yyyy", { locale: ptBR })
                    : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={meetingDate ? new Date(meetingDate) : undefined}
                  onSelect={(date) => {
                    if (date) onChange({ meetingDate: format(date, "yyyy-MM-dd") });
                    setDatePickerOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          ) : (
            <p className="text-sm font-medium">
              {meetingDate 
                ? format(new Date(meetingDate), "dd/MM/yyyy", { locale: ptBR })
                : "—"}
            </p>
          )}
        </div>

        {/* Participantes */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
            <Users className="h-3 w-3" />
            Participantes
          </label>
          {isEditing ? (
            <Popover open={participantsOpen} onOpenChange={setParticipantsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start h-9 text-sm font-normal truncate",
                    !participants.length && "text-muted-foreground"
                  )}
                >
                  {participants.length > 0 
                    ? `${participants.length} selecionado(s)`
                    : "Adicionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar..." />
                  <CommandList>
                    <CommandEmpty>Nenhum resultado.</CommandEmpty>
                    <CommandGroup>
                      {profiles.map((profile) => {
                        const isSelected = participants.includes(profile.full_name);
                        return (
                          <CommandItem
                            key={profile.id}
                            onSelect={() => toggleParticipant(profile.full_name)}
                            className="cursor-pointer"
                          >
                            <Checkbox checked={isSelected} className="mr-2" />
                            <span className="truncate">{profile.full_name}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <p className="text-sm font-medium truncate">
              {participants.length > 0 ? participants.join(", ") : "—"}
            </p>
          )}
        </div>

        {/* Responsável */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
            <User className="h-3 w-3" />
            Responsável
          </label>
          {isEditing ? (
            <Select
              value={responsible}
              onValueChange={(value) => onChange({ responsible: value })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.full_name}>
                    {profile.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm font-medium">{responsible || "—"}</p>
          )}
        </div>

        {/* Período analisado */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            Período analisado
          </label>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <Popover open={periodStartOpen} onOpenChange={setPeriodStartOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 h-9 text-xs font-normal px-2"
                  >
                    {analysisPeriodStart 
                      ? format(new Date(analysisPeriodStart), "dd/MM", { locale: ptBR })
                      : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={analysisPeriodStart ? new Date(analysisPeriodStart) : undefined}
                    onSelect={(date) => {
                      if (date) onChange({ analysisPeriodStart: format(date, "yyyy-MM-dd") });
                      setPeriodStartOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">a</span>
              <Popover open={periodEndOpen} onOpenChange={setPeriodEndOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 h-9 text-xs font-normal px-2"
                  >
                    {analysisPeriodEnd 
                      ? format(new Date(analysisPeriodEnd), "dd/MM", { locale: ptBR })
                      : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={analysisPeriodEnd ? new Date(analysisPeriodEnd) : undefined}
                    onSelect={(date) => {
                      if (date) onChange({ analysisPeriodEnd: format(date, "yyyy-MM-dd") });
                      setPeriodEndOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <p className="text-sm font-medium">
              {analysisPeriodStart && analysisPeriodEnd
                ? `${format(new Date(analysisPeriodStart), "dd/MM", { locale: ptBR })} a ${format(new Date(analysisPeriodEnd), "dd/MM", { locale: ptBR })}`
                : "—"}
            </p>
          )}
        </div>
      </div>

      {/* Canais em foco */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <Hash className="h-3 w-3" />
          Canais em foco
        </label>
        <div className="flex flex-wrap gap-1.5">
          {isEditing ? (
            CHANNEL_OPTIONS.map((channel) => {
              const isSelected = focusChannels.includes(channel);
              return (
                <button
                  key={channel}
                  onClick={() => toggleChannel(channel)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {channel}
                </button>
              );
            })
          ) : (
            focusChannels.length > 0 ? (
              focusChannels.map((channel) => (
                <Badge key={channel} variant="secondary" className="text-xs">
                  {channel}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Nenhum canal selecionado</span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
