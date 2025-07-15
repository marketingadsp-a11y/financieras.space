
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import type { Plaza } from "@/lib/data";
import { getPlazas } from "@/services/plaza-service";
import { Loader2, Building, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const PlazaCard = ({ plaza }: { plaza: Plaza }) => (
    <Card className="flex flex-col group hover:border-primary transition-all">
        <CardHeader>
            <div className="flex items-center gap-4">
                 <div className="p-3 bg-primary/10 rounded-lg w-fit">
                    <Building className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div>
                    <CardTitle>{plaza.name}</CardTitle>
                    <CardDescription>Prefijo: {plaza.prefix}</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground">Gestiona carteras, grupos y asigna clientes a esta plaza.</p>
        </CardContent>
        <CardFooter>
            <Button asChild className="w-full">
                <Link href={`/tools/loan-control/plaza/${plaza.id}`}>
                    Administrar Plaza
                    <ArrowRight className="ml-2 h-4 w-4" />
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
        const fetchPlazasForUser = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const shouldFetchAll = user.isSuperAdmin || user.isToolAdmin;
                const plazasFromDb = await getPlazas({ prefix: user.prefix, fetchAll: shouldFetchAll });
                setPlazas(plazasFromDb);
            } catch (error) {
                console.error("Failed to fetch plazas", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las plazas.' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchPlazasForUser();
    }, [user, toast]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Cargando plazas...</span>
            </div>
        );
    }
  
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Control de Préstamo</h1>
                    <p className="text-muted-foreground">
                        Selecciona una plaza para organizar clientes en carteras y grupos.
                    </p>
                </div>
            </div>

            {plazas.length > 0 ? (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {plazas.map(plaza => (
                        <PlazaCard key={plaza.id} plaza={plaza} />
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">No hay plazas disponibles. Un administrador debe crear una primero.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
