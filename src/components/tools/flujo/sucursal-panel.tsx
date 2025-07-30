
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { FlujoSucursal, FlujoEntry, FlujoWeeklySummary, FlujoGasto } from "@/lib/data";
import { getFlujoSucursalById, addFlujoEntry, getFlujoWeeklySummary, addGastoToSummary, updateComisionesInSummary, deleteFlujoEntry } from "@/services/flujo-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Calendar, Wallet, TrendingUp, TrendingDown, Coins, PlusCircle, Trash2 } from "lucide-react";
import { FlujoSucursalEntryForm } from "./sucursal-entry-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent } from "@/components/ui/alert-dialog";


const WeeklyHistoryTable = ({ entries, canDelete, onDelete }: { entries: FlujoEntry[], canDelete: boolean, onDelete: (entry: FlujoEntry) => void }) => {
    if (entries.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">No hay registros para esta semana.</p>;
    }

    const formatCurrency = (value?: number) => {
        const amount = typeof value === 'number' ? value : 0;
        return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

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
                        <TableHead className="text-right">Entrantes</TableHead>
                        <TableHead className="text-right">Salientes</TableHead>
                        <TableHead className="text-right font-bold">Total Cobrado</TableHead>
                         {canDelete && <TableHead className="w-[50px]">Acción</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entries.map(entry => (
                        <TableRow key={entry.id}>
                            <TableCell className="font-medium">{format(entry.date, 'EEEE dd/MM/yy', { locale: es })}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entry.fondo)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entry.debeEntregar)}</TableCell>
                            <TableCell className="text-right text-red-500">{formatCurrency(entry.falla)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entry.recuperado)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entry.entrantes)}</TableCell>
                            <TableCell className="text-right text-red-500">{formatCurrency(entry.salientes)}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(entry.totalCobrado)}</TableCell>
                            {canDelete && (
                                <TableCell>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitleComponent>¿Confirmar Eliminación?</AlertDialogTitleComponent>
                                                <AlertDialogDescriptionComponent>
                                                    Esta acción es irreversible. Se eliminará el registro y se ajustarán los saldos correspondientes.
                                                </AlertDialogDescriptionComponent>
                                            </AlertDialogHeader>
                                            <AlertDialogFooterComponent>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => onDelete(entry)}>Eliminar</AlertDialogAction>
                                            </AlertDialogFooterComponent>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

const GastosDialog = ({ summary, onSave, onClose }: { summary: FlujoWeeklySummary, onSave: (gasto: { amount: number, description: string }) => Promise<void>, onClose: () => void }) => {
    const [amount, setAmount] = React.useState<number | undefined>();
    const [description, setDescription] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async () => {
        if (!amount || !description) return;
        setIsSubmitting(true);
        await onSave({ amount, description });
        setIsSubmitting(false);
        setAmount(undefined);
        setDescription('');
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Gestión de Gastos de la Semana</DialogTitle>
                <DialogDescription>Añade los gastos realizados durante esta semana. Se descontarán del total cobrado.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 items-end">
                    <div className="col-span-3 sm:col-span-1">
                        <Label htmlFor="gasto-amount">Monto</Label>
                        <Input id="gasto-amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} placeholder="0.00" />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                        <Label htmlFor="gasto-desc">Descripción</Label>
                        <Input id="gasto-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Gasolina, Papelería" />
                    </div>
                </div>
                 <Button onClick={handleSubmit} disabled={isSubmitting || !amount || !description}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                        Agregar Gasto
                    </Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                <h4 className="text-sm font-medium">Gastos Registrados</h4>
                {summary.gastos.length > 0 ? (
                    summary.gastos.map(g => (
                        <div key={g.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                            <span>{g.description}</span>
                            <span className="font-mono">${g.amount.toLocaleString('es-MX')}</span>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay gastos registrados.</p>
                )}
            </div>
             <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cerrar</Button>
            </DialogFooter>
        </DialogContent>
    )
}

const ComisionesDialog = ({ summary, onSave, onClose }: { summary: FlujoWeeklySummary, onSave: (amount: number) => Promise<void>, onClose: () => void }) => {
    const [amount, setAmount] = React.useState<number | undefined>(summary.comisiones || undefined);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async () => {
        if (amount === undefined) return;
        setIsSubmitting(true);
        await onSave(amount);
        setIsSubmitting(false);
        onClose();
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Ingreso de Comisiones</DialogTitle>
                <DialogDescription>Ingresa el monto total de comisiones de la semana. Este se descontará del total cobrado.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
                <Label htmlFor="comision-amount">Monto de Comisiones</Label>
                <Input id="comision-amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} placeholder="0.00" autoFocus/>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Guardar Comisiones
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};


export function FlujoSucursalPanel({ sucursalId }: { sucursalId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sucursal, setSucursal] = React.useState<FlujoSucursal | null>(null);
  const [weeklySummary, setWeeklySummary] = React.useState<FlujoWeeklySummary | null>(null);
  const [weeklyEntries, setWeeklyEntries] = React.useState<FlujoEntry[]>([]);
  const [weekDateRange, setWeekDateRange] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showGastosDialog, setShowGastosDialog] = React.useState(false);
  const [showComisionesDialog, setShowComisionesDialog] = React.useState(false);

  const fetchData = React.useCallback(async () => {
      setIsLoading(true);
      try {
          // Fetch sucursal data first
          const sucursalData = await getFlujoSucursalById(sucursalId);
          if (!sucursalData) throw new Error("No se encontró la sucursal.");
          setSucursal(sucursalData);
          
          // Then, fetch summary and entries, this may fail if there are no entries but it won't stop the page from loading
          try {
              const { summary, dateRange, entries } = await getFlujoWeeklySummary(sucursalId);
              setWeeklySummary(summary);
              setWeekDateRange(dateRange);
              setWeeklyEntries(entries);
          } catch(summaryError) {
              console.warn("Could not fetch weekly summary, probably no entries yet.", summaryError);
              setWeeklySummary(null);
              setWeeklyEntries([]);
              setWeekDateRange("No hay datos para esta semana");
          }

      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudo cargar la sucursal.' });
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
        const entryData = { ...data, sucursalId, date: new Date() };
        await addFlujoEntry(entryData);
        toast({ title: 'Éxito', description: 'Registro guardado correctamente.' });
        fetchData();
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudo guardar el registro.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entry: FlujoEntry) => {
    try {
        await deleteFlujoEntry(entry.id);
        toast({ title: "Éxito", description: "Registro eliminado y saldos ajustados." });
        fetchData();
    } catch(e: any) {
        toast({ variant: "destructive", title: "Error", description: e.message || 'No se pudo eliminar el registro.' });
    }
  }
  
  const handleSaveGasto = async (gasto: { amount: number, description: string }) => {
    if (!weeklySummary) return;
    try {
        await addGastoToSummary(weeklySummary.id, gasto);
        toast({ title: 'Éxito', description: 'Gasto agregado.' });
        fetchData(); // Refresh summary data
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el gasto.' });
    }
  }

  const handleSaveComisiones = async (amount: number) => {
     if (!weeklySummary) return;
      try {
        await updateComisionesInSummary(weeklySummary.id, amount);
        toast({ title: 'Éxito', description: 'Comisiones guardadas.' });
        fetchData(); // Refresh summary data
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron guardar las comisiones.' });
    }
  }
  
  const totalGastos = weeklySummary?.gastos.reduce((acc, g) => acc + g.amount, 0) ?? 0;
  const totalComisiones = weeklySummary?.comisiones ?? 0;
  const totalCobrado = weeklySummary?.totalCobradoSemanal ?? 0;
  const totalFinal = totalCobrado - totalComisiones - totalGastos;

  const canDelete = user ? !user.isToolAdmin && !user.isPlazaUser : false;

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

        {weeklySummary && (
            <Card>
                 <CardHeader>
                    <CardTitle>Resumen de la Semana</CardTitle>
                    <CardDescription>Totales calculados para la semana actual ({weekDateRange}).</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="p-4 rounded-lg bg-green-500/10 text-green-700">
                        <p className="text-sm font-medium flex items-center gap-2"><TrendingUp/> Total Cobrado</p>
                        <p className="text-2xl font-bold">${totalCobrado.toLocaleString('es-MX')}</p>
                    </div>
                     <div className="p-4 rounded-lg bg-red-500/10 text-red-700 cursor-pointer hover:bg-red-500/20" onClick={() => setShowComisionesDialog(true)}>
                        <p className="text-sm font-medium flex items-center gap-2"><Coins/> Comisiones</p>
                        <p className="text-2xl font-bold">${totalComisiones.toLocaleString('es-MX')}</p>
                    </div>
                     <div className="p-4 rounded-lg bg-red-500/10 text-red-700 cursor-pointer hover:bg-red-500/20" onClick={() => setShowGastosDialog(true)}>
                        <p className="text-sm font-medium flex items-center gap-2"><TrendingDown/> Gastos</p>
                        <p className="text-2xl font-bold">${totalGastos.toLocaleString('es-MX')}</p>
                    </div>
                     <div className="p-4 rounded-lg bg-blue-500/10 text-blue-700">
                        <p className="text-sm font-medium flex items-center gap-2"><Wallet/> Total Final</p>
                        <p className="text-2xl font-bold">${totalFinal.toLocaleString('es-MX')}</p>
                    </div>
                </CardContent>
            </Card>
        )}

        <Card>
            <CardHeader>
                <CardTitle>Historial de la Semana</CardTitle>
                <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{weekDateRange}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <WeeklyHistoryTable entries={weeklyEntries} canDelete={canDelete} onDelete={handleDeleteEntry} />
            </CardContent>
        </Card>
        
        {weeklySummary && (
            <Dialog open={showGastosDialog} onOpenChange={setShowGastosDialog}>
                <GastosDialog summary={weeklySummary} onSave={handleSaveGasto} onClose={() => setShowGastosDialog(false)} />
            </Dialog>
        )}
        {weeklySummary && (
             <Dialog open={showComisionesDialog} onOpenChange={setShowComisionesDialog}>
                <ComisionesDialog summary={weeklySummary} onSave={handleSaveComisiones} onClose={() => setShowComisionesDialog(false)} />
            </Dialog>
        )}
    </div>
  );
}
