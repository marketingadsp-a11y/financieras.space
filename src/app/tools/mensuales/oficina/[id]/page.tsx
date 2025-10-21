
import { OficinaDetailPanel } from "@/components/tools/mensuales/oficina-detail";

export default function OficinaDetailPage({ params }: { params: { id: string } }) {
  return <OficinaDetailPanel oficinaId={params.id} />;
}
