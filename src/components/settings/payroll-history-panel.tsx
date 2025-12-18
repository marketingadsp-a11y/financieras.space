
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";

export function PayrollHistoryPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Nómina</CardTitle>
        <CardDescription>
          Consulta el historial de todas las nóminas que se han guardado.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <History className="h-16 w-16 mb-4" />
        <p className="text-lg font-semibold">Funcionalidad en construcción</p>
        <p className="text-sm">Próximamente podrás ver el historial de nóminas aquí.</p>
      </CardContent>
    </Card>
  );
}
