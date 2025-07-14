
"use client";

import * as React from "react";
import Link from "next/link";
import { getPlazaById } from "@/services/plaza-service";
import type { Plaza, LoanControlCartera } from "@/lib/data";
import { Loader2, FolderKanban, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCarterasByPlaza } from "@/services/loan-control-service";


const CarteraCard = ({ cartera }: { cartera: LoanControlCartera }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
                <FolderKanban className="h-5 w-5 text-muted-foreground" />
                {cartera.name}
            </CardTitle>
        </CardHeader>
        <CardContent>
           <p className="text-sm text-muted-foreground">
                Selecciona esta cartera para administrar sus grupos de clientes.
           </p>
        </CardContent>
        <CardFooter>
            <Button asChild className="w-full">
               <Link href={{
                  pathname: `/tools/loan-control/cartera/${cartera.id}`,
                  query: { plazaId: cartera.plazaId }
               }}>
                    Administrar Grupos <ArrowRight className="ml-2" />
                </Link>
            </Button>
        </CardFooter>
    </Card>
);

export function LoanControlPlazaDetail({ plazaId }: { plazaId: string }) {
  const [plaza, setPlaza] = React.useState<Plaza | null>(null);
  const [carteras, setCarteras] = React.useState<LoanControlCartera[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [plazaData, carterasData] = await Promise.all([
           getPlazaById(plazaId),
           getCarterasByPlaza(plazaId)
        ]);
        setPlaza(plazaData);
        setCarteras(carterasData);
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
          Gestiona las carteras de esta plaza. Cada cartera puede contener múltiples grupos de clientes.
        </p>
      </div>

      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Carteras</CardTitle>
                    <CardDescription>
                        Organiza tus clientes en diferentes carteras.
                    </CardDescription>
                </div>
                {/* Add button for new cartera */}
            </div>
        </CardHeader>
        <CardContent>
            {carteras.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {carteras.map((cartera) => (
                        <CarteraCard key={cartera.id} cartera={cartera} />
                    ))}
                </div>
            ) : (
                <p className="text-muted-foreground text-center py-8">
                    No hay carteras registradas para esta plaza.
                </p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

    