import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Channel {
  id: string;
  name: string;
  type: string;
}

interface ReporteiChannelTabsProps {
  channels: Channel[];
  children: (channel: Channel) => React.ReactNode;
}

export const ReporteiChannelTabs = ({ channels, children }: ReporteiChannelTabsProps) => {
  if (channels.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum canal selecionado
      </div>
    );
  }

  return (
    <Tabs defaultValue={channels[0]?.id} className="w-full">
      <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${channels.length}, 1fr)` }}>
        {channels.map((channel) => (
          <TabsTrigger key={channel.id} value={channel.id} className="capitalize">
            {channel.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {channels.map((channel) => (
        <TabsContent key={channel.id} value={channel.id} className="mt-6">
          {children(channel)}
        </TabsContent>
      ))}
    </Tabs>
  );
};
