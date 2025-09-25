
import { PrestamoDetail } from "@/components/tools/mensuales/prestamo-detail";

export default function PrestamoDetailPage({ params }: { params: { id: string } }) {
  return <PrestamoDetail clienteId={params.id} />;
}
