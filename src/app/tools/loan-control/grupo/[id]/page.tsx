import { GrupoDetail } from "@/components/tools/loan-control/grupo-detail";

export default function GrupoDetailPage({ params }: { params: { id: string } }) {
    return <GrupoDetail grupoId={params.id} />;
}
