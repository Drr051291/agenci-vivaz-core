import { ClientCrmIntegration } from "./ClientCrmIntegration";
import { PipedriveMetrics } from "./PipedriveMetrics";
import { DashboardList } from "./DashboardList";
import { Separator } from "@/components/ui/separator";

interface ClientDashboardsNewProps {
  clientId: string;
}

export function ClientDashboardsNew({ clientId }: ClientDashboardsNewProps) {
  return (
    <div className="space-y-8 pb-8">
      {/* Integração CRM */}
      <section>
        <ClientCrmIntegration clientId={clientId} />
      </section>

      <Separator />

      {/* Métricas do Pipedrive */}
      <section>
        <div className="mb-4">
          <h3 className="text-xl font-semibold">Métricas do Pipedrive</h3>
          <p className="text-sm text-muted-foreground">
            Visualize as principais métricas do seu pipeline
          </p>
        </div>
        <PipedriveMetrics clientId={clientId} />
      </section>

      <Separator />

      {/* Dashboards Reportei */}
      <section>
        <DashboardList clientId={clientId} />
      </section>
    </div>
  );
}
