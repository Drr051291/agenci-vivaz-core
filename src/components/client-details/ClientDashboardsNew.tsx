import { DashboardList } from "./DashboardList";

interface ClientDashboardsNewProps {
  clientId: string;
}

export function ClientDashboardsNew({ clientId }: ClientDashboardsNewProps) {
  return (
    <div className="pb-8">
      <DashboardList clientId={clientId} />
    </div>
  );
}
