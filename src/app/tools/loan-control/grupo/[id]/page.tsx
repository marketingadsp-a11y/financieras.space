
import { LoanControlGrupoDetail } from "@/components/tools/loan-control/grupo-detail";

export default function LoanControlGrupoDetailPage({ params, searchParams }: { params: { id: string }, searchParams: { plazaId: string, carteraId: string } }) {
  return <LoanControlGrupoDetail grupoId={params.id} plazaId={searchParams.plazaId} carteraId={searchParams.carteraId} />;
}
