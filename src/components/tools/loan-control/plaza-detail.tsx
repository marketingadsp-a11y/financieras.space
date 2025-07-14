
"use client";

import * as React from "react";
import { getPlazaById } from "@/services/plaza-service";
import type { Plaza, LoanControlCartera } from "@/lib/data";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function LoanControlPlazaDetail({ plazaId }: { plazaId: string }) {
  const [plaza, setPlaza] = React.useState<Plaza | null>(null);
  const [carteras, setCarteras] = React.useState<LoanControlCartera[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const plazaData = await getPlazaById(plazaId);
        setPlaza(plazaData);
        // TODO: Fetch carteras for this plaza
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información de la plaza." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [plazaId, toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando información...</span>
      </div>
    );
  }

  if (!plaza) {
    return <div className="text-center">No se encontró la plaza.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plaza: {plaza.name}</h1>
        <p className="text-muted-foreground">
          Gestiona las carteras de esta plaza.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Carteras</CardTitle>
          <CardDescription>
            Organiza tus clientes en diferentes carteras.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            (Aquí se mostrará la lista de carteras y las opciones para gestionarlas)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
