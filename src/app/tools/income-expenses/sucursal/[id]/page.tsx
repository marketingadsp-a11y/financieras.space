import { SucursalPanel } from "@/components/tools/income-expenses/sucursal/sucursal-panel";

export default function SucursalPanelPage({ params }: { params: { id: string } }) {
  return <SucursalPanel sucursalId={params.id} />;
}
