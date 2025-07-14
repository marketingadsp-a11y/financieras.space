
import { LoanControlPlazaDetail } from "@/components/tools/loan-control/plaza-detail";

export default function LoanControlPlazaDetailPage({ params }: { params: { id: string } }) {
  return <LoanControlPlazaDetail plazaId={params.id} />;
}
