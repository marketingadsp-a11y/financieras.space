
"use client";

import * as React from "react";
import type { LoanControlCartera } from "@/lib/data";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function LoanControlCarteraDetail({ carteraId }: { carteraId: string }) {
  const [cartera, setCartera] = React.useState<LoanControlCartera | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // TODO: Fetch cartera by ID
        // const carteraData = await getCarteraById(carteraId);
        // setCartera(carteraData);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cartera: (Nombre de Cartera)</h1>
        <p className="text-muted-foreground">
          Gestiona los grupos de esta cartera.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grupos</CardTitle>
          <CardDescription>
            Organiza tus clientes en diferentes grupos.
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
