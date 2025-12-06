import { DashboardList } from "./DashboardList";
import { ReporteiIntegration } from "./ReporteiIntegration";

interface ClientDashboardsNewProps {
  clientId: string;
  clientName?: string;
}

export function ClientDashboardsNew({ clientId, clientName }: ClientDashboardsNewProps) {
  return (
    <div className="pb-8 space-y-6">
      <ReporteiIntegration clientId={clientId} clientName={clientName || ''} />
      <DashboardList clientId={clientId} clientName={clientName} />
    </div>
  );
}
