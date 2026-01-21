import { OficinaPanel } from "@/components/tools/concentrado/oficina-panel";

export default function OficinaPanelPage({ params }: { params: { id: string } }) {
  return <OficinaPanel oficinaId={params.id} />;
}
