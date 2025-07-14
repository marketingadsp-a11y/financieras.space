
import { LoanControlCarteraDetail } from "@/components/tools/loan-control/cartera-detail";

export default function LoanControlCarteraDetailPage({ params }: { params: { id: string } }) {
  return <LoanControlCarteraDetail carteraId={params.id} />;
}
