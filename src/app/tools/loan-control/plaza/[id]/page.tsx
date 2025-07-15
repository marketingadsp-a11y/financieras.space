import { PlazaDetail } from "@/components/tools/loan-control/plaza-detail";

export default function PlazaDetailPage({ params }: { params: { id: string } }) {
  return <PlazaDetail plazaId={params.id} />;
}
