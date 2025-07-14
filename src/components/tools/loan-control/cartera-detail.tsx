
"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, FolderKanban, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getCarteraById } from "@/services/loan-control-service";
import type { LoanControlCartera } from "@/lib/data";

export function LoanControlCarteraDetail({ carteraId, plazaId }: { carteraId: string, plazaId: string }) {
  const [cartera, setCartera] = React.useState<LoanControlCartera | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const carteraData = await getCarteraById(carteraId);
        setCartera(carteraData);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información de la cartera." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [carteraId, toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando información...</span>
      </div>
    );
  }
  
  if (!cartera) {
     return <div className="text-center">No se encontró la cartera.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cartera: {cartera.name}</h1>
        <p className="text-muted-foreground">
          Gestiona los grupos de clientes de esta cartera.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/>Grupos</CardTitle>
            {/* Add button for new group */}
          </div>
          <CardDescription>
            Organiza tus clientes en diferentes grupos dentro de la cartera.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            (Aquí se mostrará la lista de grupos y las opciones para gestionarlos)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

    