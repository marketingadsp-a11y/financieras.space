

"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { OficinaRegistro, OficinaSemanalRegistro } from "@/lib/data";
import { getOficinas, getTodosRegistrosPorOficina } from "@/services/registro-oficina-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Building, ArrowRight, DollarSign, Calendar } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { es } from "date-fns/locale";

type OficinaWithSummary = OficinaRegistro & {
    monthlyTotal: number;
};

const StatItem = ({ label, value }: { label: string, value: number }) => (
    <div className="flex justify-between items-center text-xs p-1.5 bg-muted/50 rounded-md">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
    </div>
);


export function RegistroOficinaDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [oficinas, setOficinas] = React.useState<OficinaWithSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      let data = await getOficinas(user.prefix);

      if (user.isPlazaUser && user.registroOficinaAccess) {
        const allowedOficinaIds = user.registroOficinaAccess.map(roa => roa.oficinaId);
        data = data.filter(o => allowedOficinaIds.includes(o.id));
      }


      const today = new Date();
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);

      const oficinasWithSummaries = await Promise.all(
        data.map(async (oficina) => {
          const registros = await getTodosRegistrosPorOficina(oficina.id);
          const registrosDelMes = registros.filter(r => {
            const registroDate = new Date(r.weekStartDate);
            return registroDate >= monthStart && registroDate <= monthEnd;
          });

          const monthlyTotal = registrosDelMes.reduce((acc, r) => {
            return acc + (r.recogidoSeguros || 0) + (r.carteraVencida || 0) + (r.interesMensual || 0) + (r.capitalMensual || 0) + (r.cajaChica || 0);
          }, 0);
          
          return {
            ...oficina,
            monthlyTotal,
          };
        })
      );

      setOficinas(oficinasWithSummaries);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las oficinas.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const currentMonthRange = React.useMemo(() => {
    const today = new Date();
    const start = format(startOfMonth(today), "dd 'de' LLLL", { locale: es });
    const end = format(endOfMonth(today), "dd 'de' LLLL", { locale: es });
    return `Del ${start} al ${end}`;
  }, []);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando oficinas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
            <CardTitle>Dashboard de Registro de Oficina</CardTitle>
            <CardDescription>
            Selecciona una oficina para comenzar a registrar los datos semanales y mensuales.
            </CardDescription>
        </CardHeader>
      </Card>

      {oficinas.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {oficinas.map((oficina) => (
            <Card key={oficina.id} className="group flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg w-fit">
                          <Building className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <div>
                          <CardTitle>{oficina.name}</CardTitle>
                          <CardDescription>ID: {oficina.displayId || 'N/A'}</CardDescription>
                      </div>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                 <div className="p-4 border rounded-lg bg-muted/20 text-center">
                    <p className="text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2 mb-2"><Calendar className="h-4 w-4"/> Resumen del Mes Actual</p>
                    <div className="flex items-center justify-center text-lg font-bold text-primary p-2 bg-primary/10 rounded-md">
                        <span>${oficina.monthlyTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                     <p className="text-xs text-muted-foreground mt-2">{currentMonthRange}</p>
                 </div>
              </CardContent>
              <CardFooter className="mt-auto">
                <Button asChild className="w-full">
                  <Link href={`/tools/registro-oficina/oficina/${oficina.id}`}>
                    Gestionar Oficina
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No hay oficinas creadas. Comienza por crear una en "Gestionar Oficinas".
          </CardContent>
        </Card>
      )}
    </div>
  );
}
