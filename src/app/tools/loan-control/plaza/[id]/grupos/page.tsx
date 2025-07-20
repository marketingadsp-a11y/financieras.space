
"use client";

import { GruposManagement } from "@/components/tools/loan-control/grupos-management";

export default function GruposManagementPage({ params }: { params: { id: string } }) {
  return <GruposManagement plazaId={params.id} />;
}

    