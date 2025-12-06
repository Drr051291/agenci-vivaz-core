import { DashboardList } from "./DashboardList";

interface ClientDashboardsNewProps {
  clientId: string;
  clientName?: string;
}

export function ClientDashboardsNew({ clientId, clientName }: ClientDashboardsNewProps) {
  return (
    <div className="pb-8 space-y-6">
      <DashboardList clientId={clientId} clientName={clientName} />
    </div>
  );
}
