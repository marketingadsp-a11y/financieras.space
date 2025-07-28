
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { FlujoSucursal, FlujoEntry } from "@/lib/data";
import { getFlujoSucursalById, addFlujoEntry } from "@/services/flujo-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { FlujoSucursalEntryForm } from "./sucursal-entry-form";

export function FlujoSucursalPanel({ sucursalId }: { sucursalId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sucursal, setSucursal] = React.useState<FlujoSucursal | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    const fetchSucursal = async () => {
      setIsLoading(true);
      try {
        const data = await getFlujoSucursalById(sucursalId);
        setSucursal(data);
      } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la sucursal.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSucursal();
  }, [sucursalId, toast]);

  const handleFormSubmit = async (data: Omit<FlujoEntry, 'id' | 'sucursalId' | 'date'>) => {
    setIsSubmitting(true);
    try {
        await addFlujoEntry({ ...data, sucursalId });
        toast({ title: 'Éxito', description: 'Registro guardado correctamente.' });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el registro.' });
    } finally {
        setIsSubmitting(false);
    }
  };


  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="mr-2 h-8 w-8 animate-spin" />Cargando datos de la sucursal...</div>;
  }

  if (!sucursal) {
    return <div className="text-center py-10">No se encontró la sucursal.</div>;
  }

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Panel de Flujo: {sucursal.name}</h1>

        <Card>
            <CardHeader>
                <CardTitle>Ingreso de Datos</CardTitle>
                <CardDescription>Añade un nuevo registro de flujo para el día de hoy.</CardDescription>
            </CardHeader>
            <CardContent>
                <FlujoSucursalEntryForm
                    onSubmit={handleFormSubmit}
                    isSubmitting={isSubmitting}
                />
            </CardContent>
        </Card>
    </div>
  );
}
