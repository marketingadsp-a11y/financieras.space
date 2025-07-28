
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { FlujoSucursal, FlujoEntry } from "@/lib/data";
import { getFlujoSucursalById, addFlujoEntry, getFlujoEntriesForWeek } from "@/services/flujo-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar } from "lucide-react";
import { FlujoSucursalEntryForm } from "./sucursal-entry-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const WeeklyHistoryTable = ({ entries }: { entries: FlujoEntry[] }) => {
    if (entries.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">No hay registros para esta semana.</p>;
    }

    const formatCurrency = (value: number) => `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Fondo</TableHead>
                        <TableHead className="text-right">Debe Entregar</TableHead>
                        <TableHead className="text-right">Falla</TableHead>
                        <TableHead className="text-right">Recuperado</TableHead>
                        <TableHead className="text-right">Salientes</TableHead>
                        <TableHead className="text-right">Entrantes</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entries.map(entry => (
                        <TableRow key={entry.id}>
                            <TableCell className="font-medium">{format(entry.date, 'EEEE dd/MM/yy', { locale: es })}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entry.fondo)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entry.debeEntregar)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entry.falla)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entry.recuperado)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entry.salientes)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entry.entrantes)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export function FlujoSucursalPanel({ sucursalId }: { sucursalId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sucursal, setSucursal] = React.useState<FlujoSucursal | null>(null);
  const [weeklyEntries, setWeeklyEntries] = React.useState<FlujoEntry[]>([]);
  const [weekDateRange, setWeekDateRange] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchData = React.useCallback(async () => {
      setIsLoading(true);
      try {
          const [sucursalData, { entries, dateRange }] = await Promise.all([
              getFlujoSucursalById(sucursalId),
              getFlujoEntriesForWeek(sucursalId, new Date())
          ]);
          setSucursal(sucursalData);
          setWeeklyEntries(entries);
          setWeekDateRange(dateRange);
      } catch (e) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la sucursal o su historial.' });
      } finally {
          setIsLoading(false);
      }
  }, [sucursalId, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFormSubmit = async (data: Omit<FlujoEntry, 'id' | 'sucursalId' | 'date'>) => {
    setIsSubmitting(true);
    try {
        await addFlujoEntry({ ...data, sucursalId, date: new Date() });
        toast({ title: 'Éxito', description: 'Registro guardado correctamente.' });
        fetchData(); // Refresh data to show new entry in history
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

        <Card>
            <CardHeader>
                <CardTitle>Historial de la Semana</CardTitle>
                <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{weekDateRange}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <WeeklyHistoryTable entries={weeklyEntries} />
            </CardContent>
        </Card>
    </div>
  );
}
