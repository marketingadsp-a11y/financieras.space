import { CarteraDetail } from "@/components/tools/loan-control/cartera-detail";

export default function CarteraDetailPage({ params }: { params: { id: string } }) {
    return <CarteraDetail carteraId={params.id} />;
}
