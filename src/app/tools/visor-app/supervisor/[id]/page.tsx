
import { SupervisorClientManagement } from "@/components/tools/visor-app/supervisor-client-management";

export default function SupervisorClientsPage({ params }: { params: { id: string } }) {
  return <SupervisorClientManagement supervisorId={params.id} />;
}
