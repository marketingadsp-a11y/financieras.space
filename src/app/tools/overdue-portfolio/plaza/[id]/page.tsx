
import { PlazaDetail } from "@/components/tools/overdue-portfolio/plaza-detail";

export default function PlazaDetailPage({ params }: { params: { id: string } }) {
  return <PlazaDetail plazaId={params.id} />;
}
