
import { FlujoSucursalPanel } from "@/components/tools/flujo/sucursal-panel";

export default function FlujoSucursalPage({ params }: { params: { id: string } }) {
  return <FlujoSucursalPanel sucursalId={params.id} />;
}
