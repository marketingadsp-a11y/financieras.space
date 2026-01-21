"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Wrench, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getConcentradoOficinaById } from "@/services/concentrado-service";
import * as React from "react";
import { Loader2 } from "lucide-react";

export function OficinaPanel({ oficinaId }: { oficinaId: string }) {
  const [oficinaName, setOficinaName] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    getConcentradoOficinaById(oficinaId).then(oficina => {
      if (oficina) {
        setOficinaName(oficina.name);
      }
      setIsLoading(false);
    });
  }, [oficinaId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando oficina...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <Button variant="outline" asChild>
            <Link href="/tools/concentrado/oficinas">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Oficinas
            </Link>
        </Button>
      <Card>
        <CardHeader>
          <CardTitle>Panel de la Oficina: {oficinaName}</CardTitle>
          <CardDescription>
            Esta es el área de trabajo para la oficina. Aquí se registrarán los datos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <div className="text-center text-muted-foreground">
              <Wrench className="h-16 w-16 mx-auto" />
              <p className="mt-4">Panel en construcción.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
