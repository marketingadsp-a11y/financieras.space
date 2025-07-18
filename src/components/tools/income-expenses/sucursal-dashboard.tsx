
"use client";

import * as React from "react";
import { Banknote, Building, Landmark, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Sucursal } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { getSucursales } from "@/services/income-expenses-service";
import Link from "next/link";
import { useRouter } from "next/navigation";

const SucursalCard = ({ sucursal }: { sucursal: Sucursal }) => {
  return (
    <Card className="flex flex-col text-center transition-all hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="items-center">
        <Avatar className="h-16 w-16 mb-2">
            <AvatarImage src={sucursal.logoUrl} alt={sucursal.name} data-ai-hint="logo company" />
            <AvatarFallback>{sucursal.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-lg">{sucursal.name}</CardTitle>
          <CardDescription>{sucursal.manager}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="rounded-lg bg-muted p-4">
            <p className="text-xs text-muted-foreground tracking-widest">FONDO ACTUAL</p>
            <p className="text-4xl font-bold text-primary">${sucursal.currentBalance.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
        </div>
      </CardContent>
      <CardFooter className="p-4">
        <Button asChild className="w-full bg-primary/90 hover:bg-primary" size="lg">
            <Link href={`/tools/income-expenses/sucursal/${sucursal.id}`}>
                <Banknote className="mr-2" />
                Administrar Panel
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};


export function SucursalDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [sucursales, setSucursales] = React.useState<Sucursal[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const fetchData = React.useCallback(async () => {
    if (!user?.prefix || !user.sucursalAccess) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const allSucursales = await getSucursales(user.prefix);
      const accessibleSucursalIds = user.sucursalAccess.map(sa => sa.sucursalId);
      const accessibleSucursales = allSucursales.filter(s => accessibleSucursalIds.includes(s.id));
      
      // If there is only one sucursal, redirect to its panel
      if (accessibleSucursales.length === 1) {
        router.replace(`/tools/income-expenses/sucursal/${accessibleSucursales[0].id}`);
        // We don't stop loading here, let the redirect happen.
        // A loading state on the redirected page will handle the UI.
        return;
      }

      setSucursales(accessibleSucursales);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos de tus sucursales.'});
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, user?.sucursalAccess, toast, router]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);


  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="mr-2 h-8 w-8 animate-spin" />Cargando sucursales...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Mis Sucursales</h1>
        <Button variant="ghost" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

       <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">Sucursales Asignadas</h2>
            </div>
             <CardDescription>
                Estas son las sucursales a las que tienes acceso.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {sucursales.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {sucursales.map(s => (
                        <SucursalCard key={s.id} sucursal={s} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    <p>No tienes sucursales asignadas.</p>
                    <p className="text-sm">Contacta a tu administrador para que te asigne acceso.</p>
                </div>
            )}
        </CardContent>
       </Card>
    </div>
  );
}
