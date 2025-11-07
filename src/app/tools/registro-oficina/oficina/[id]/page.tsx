
import { OficinaRegistroPanel } from "@/components/tools/registro-oficina/oficina-registro-panel";

export default function OficinaRegistroPage({ params }: { params: { id: string } }) {
  return <OficinaRegistroPanel oficinaId={params.id} />;
}
