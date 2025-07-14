
"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Building, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import type { Plaza } from "@/lib/data";
import { getPlazas } from "@/services/plaza-service";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const PlazaCard = ({ plaza }: { plaza: Plaza }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-5 w-5 text-muted-foreground" />
                {plaza.name}
            </CardTitle>
        </CardHeader>
        <CardContent>
           <p className="text-sm text-muted-foreground">
                Selecciona esta plaza para administrar sus carteras y grupos de clientes.
           </p>
        </CardContent>
        <CardFooter>
            <Button asChild className="w-full">
               <Link href={`/tools/loan-control/plaza/${plaza.id}`}>
                    Administrar Carteras <ArrowRight className="ml-2" />
                </Link>
            </Button>
        </CardFooter>
    </Card>
);

export function LoanControlDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plazas, setPlazas] = React.useState<Plaza[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchUserPlazas = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const shouldFetchAll = user.isSuperAdmin || user.isToolAdmin;
            const plazasFromDb = await getPlazas({ prefix: user.prefix, fetchAll: shouldFetchAll });
            setPlazas(plazasFromDb);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las plazas.' });
        } finally {
            setIsLoading(false);
        }
    };
    fetchUserPlazas();
  }, [user, toast]);
  
  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Control de Préstamo</h1>
            <p className="text-muted-foreground">
            Selecciona una plaza para comenzar a organizar tus carteras y grupos.
            </p>
        </div>

        {isLoading ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Cargando plazas...</span>
            </div>
        ) : plazas.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plazas.map((plaza) => (
                    <PlazaCard key={plaza.id} plaza={plaza} />
                ))}
            </div>
        ) : (
             <Card>
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">No hay plazas registradas. Comienza agregando una en la sección de "Gestionar Plazas".</p>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
