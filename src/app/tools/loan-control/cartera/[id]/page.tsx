
import { LoanControlCarteraDetail } from "@/components/tools/loan-control/cartera-detail";

export default function LoanControlCarteraDetailPage({ params, searchParams }: { params: { id: string }, searchParams: { plazaId: string } }) {
  return <LoanControlCarteraDetail carteraId={params.id} plazaId={searchParams.plazaId} />;
}

    