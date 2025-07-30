

"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { FlujoSucursal, FlujoEntry, FlujoWeeklySummary, FlujoGasto, FlujoVenta } from "@/lib/data";
import { getFlujoSucursalById, addFlujoEntry, getFlujoWeeklySummary, addGastoToSummary, updateComisionesInSummary, deleteFlujoEntry, resetWeeklySummary, deleteGastoFromSummary, addVentaToSummary, deleteVentaFromSummary, transferToCentral } from "@/services/flujo-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Calendar as CalendarIcon, Wallet, TrendingUp, TrendingDown, Coins, PlusCircle, Trash2, RefreshCcw, ChevronLeft, ChevronRight, History, Receipt, GitCommitVertical, FileText, AlertTriangle, Send } from "lucide-react";
import { FlujoSucursalEntryForm } from "./sucursal-entry-form";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TransferToCentralDialog } from "./transfer-to-central-dialog";


type UnifiedHistoryItem = {
    id: string;
    date: Date;
    type: 'flujo' | 'gasto' | 'comision' | 'venta' | 'transfer_out_to_central';
    description: string;
    amount: number;
    details?: string;
    raw: FlujoEntry | FlujoGasto | FlujoVenta | { comisiones: number } | { amount: number };
    userPerformed?: string;
};

const WeeklyHistoryList = ({ 
    items, 
    canDelete, 
    onDeleteEntry,
    onDeleteGasto,
    onDeleteComisiones,
    onDeleteVenta
}: { 
    items: UnifiedHistoryItem[], 
    canDelete: boolean, 
    onDeleteEntry: (entry: FlujoEntry) => void,
    onDeleteGasto: (gasto: FlujoGasto) => void,
    onDeleteComisiones: () => void,
    onDeleteVenta: (venta: FlujoVenta) => void,
}) => {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">Sin Movimientos</h3>
                <p className="text-sm text-muted-foreground">No hay registros para esta semana.</p>
            </div>
        )
    }

    const typeInfo = {
        flujo: { label: 'Registro de Flujo', icon: GitCommitVertical, color: "text-green-600", bg: "bg-green-500/10" },
        gasto: { label: 'Gasto', icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10" },
        comision: { label: 'Comisiones', icon: Coins, color: "text-orange-500", bg: "bg-orange-500/10" },
        venta: { label: 'Venta', icon: Receipt, color: "text-purple-500", bg: "bg-purple-500/10" },
        transfer_out_to_central: { label: 'Envío a Caja Chica', icon: Send, color: "text-blue-500", bg: "bg-blue-500/10" },
    };
    
    const formatCurrency = (value?: number) => {
        const amount = typeof value === 'number' ? value : 0;
        return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    
    const renderDeleteButton = (item: UnifiedHistoryItem) => {
        if (!canDelete) return null;

        // Transfers cannot be deleted from here to maintain central account consistency
        if (item.type === 'transfer_out_to_central') return null;

        let title = '¿Confirmar Eliminación?';
        let description = 'Esta acción es irreversible.';
        let onConfirm = () => {};

        switch (item.type) {
            case 'flujo':
                title = '¿Eliminar Registro de Flujo?';
                description = 'Se eliminará el registro del día y se ajustarán los saldos.';
                onConfirm = () => onDeleteEntry(item.raw as FlujoEntry);
                break;
            case 'gasto':
                title = '¿Eliminar Gasto?';
                description = `Se eliminará el gasto "${item.description}". Esta acción es irreversible.`;
                onConfirm = () => onDeleteGasto(item.raw as FlujoGasto);
                break;
            case 'venta':
                title = '¿Eliminar Venta?';
                description = `Se eliminará la venta "${item.description}". Esta acción es irreversible.`;
                onConfirm = () => onDeleteVenta(item.raw as FlujoVenta);
                break;
            case 'comision':
                title = '¿Eliminar Comisiones?';
                description = 'Esto restablecerá las comisiones de la semana a $0.00.';
                onConfirm = () => onDeleteComisiones();
                break;
            default:
                return null;
        }

        return (
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitleComponent>{title}</AlertDialogTitleComponent>
                        <AlertDialogDescription>{description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooterComponent>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={onConfirm}>Eliminar</AlertDialogAction>
                    </AlertDialogFooterComponent>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    return (
        <div className="space-y-4">
            {items.map((item, index) => {
                const info = typeInfo[item.type];
                return (
                 <div key={`${item.id}-${index}`} className="group flex items-center space-x-4 rounded-lg bg-muted/40 p-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", info.bg)}>
                        <info.icon className={cn("h-5 w-5", info.color)} />
                    </div>
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{item.description}</p>
                        <p className="text-xs text-muted-foreground">{item.details}</p>
                    </div>
                     <div className="flex items-center space-x-4">
                        <div className="flex flex-col items-end">
                            <div className={cn("font-semibold", info.color)}>
                               {formatCurrency(item.amount)}
                            </div>
                            <p className="text-xs text-muted-foreground">{format(new Date(item.date), "dd MMM, p", { locale: es })}</p>
                        </div>
                        {renderDeleteButton(item)}
                    </div>
                </div>
                )
            })}
        </div>
    );
}

const ManagementDialog = ({
  title,
  description,
  items,
  onSave,
  onDelete,
  onClose,
  canDelete,
}: {
  title: string;
  description: string;
  items: (FlujoGasto | FlujoVenta)[];
  onSave: (item: { amount: number; description: string }) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onClose: () => void;
  canDelete: boolean;
}) => {
    const [amount, setAmount] = React.useState<number | undefined>();
    const [itemDescription, setItemDescription] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async () => {
        if (!amount || !itemDescription) return;
        setIsSubmitting(true);
        await onSave({ amount, description: itemDescription });
        setIsSubmitting(false);
        setAmount(undefined);
        setItemDescription('');
    };
    
    const handleDeleteClick = async (itemId: string) => {
        await onDelete(itemId);
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 items-end">
                    <div className="col-span-3 sm:col-span-1">
                        <Label htmlFor="item-amount">Monto</Label>
                        <Input id="item-amount" type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} placeholder="0.00" />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                        <Label htmlFor="item-desc">Descripción</Label>
                        <Input id="item-desc" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} placeholder="Ej. Gasolina, Papelería" />
                    </div>
                </div>
                 <Button onClick={handleSubmit} disabled={isSubmitting || !amount || !itemDescription}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                        Agregar
                    </Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                <h4 className="text-sm font-medium">Registrados</h4>
                {items.length > 0 ? (
                    items.map(g => (
                        <div key={g.id} className="group flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                            <span className="flex-1">{g.description}</span>
                            <span className="font-mono mx-2">${g.amount.toLocaleString('es-MX')}</span>
                             {canDelete && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4"/></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitleComponent>Eliminar Registro</AlertDialogTitleComponent>
                                            <AlertDialogDescription>¿Estás seguro de que deseas eliminar este registro? Esta acción es irreversible.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooterComponent>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteClick(g.id)}>Eliminar</AlertDialogAction>
                                        </AlertDialogFooterComponent>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay registros.</p>
                )}
            </div>
             <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cerrar</Button>
            </DialogFooter>
        </DialogContent>
    )
};


const ComisionesDialog = ({ summary, onSave, onClose }: { summary: FlujoWeeklySummary, onSave: (amount: number) => Promise<void>, onClose: () => void }) => {
    const [amount, setAmount] = React.useState<number | undefined>(summary.comisiones > 0 ? summary.comisiones : undefined);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async () => {
        const finalAmount = typeof amount === 'number' ? amount : 0;
        setIsSubmitting(true);
        await onSave(finalAmount);
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
                <Input id="comision-amount" type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} placeholder="0.00" autoFocus/>
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
    const { user, hasPermission } = useAuth();
    const { toast } = useToast();
    const [sucursal, setSucursal] = React.useState<FlujoSucursal | null>(null);
    const [weeklySummary, setWeeklySummary] = React.useState<FlujoWeeklySummary | null>(null);
    const [weeklyHistory, setWeeklyHistory] = React.useState<UnifiedHistoryItem[]>([]);
    const [weekDateRange, setWeekDateRange] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [showGastosDialog, setShowGastosDialog] = React.useState(false);
    const [showVentasDialog, setShowVentasDialog] = React.useState(false);
    const [showComisionesDialog, setShowComisionesDialog] = React.useState(false);
    const [showTransferDialog, setShowTransferDialog] = React.useState(false);
    const [showResetDialog, setShowResetDialog] = React.useState(false);
    const [isReseting, setIsReseting] = React.useState(false);
    const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
    const [firestoreError, setFirestoreError] = React.useState<string | null>(null);

    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        setFirestoreError(null);
        try {
            const sucursalData = await getFlujoSucursalById(sucursalId);
            if (!sucursalData) throw new Error("No se encontró la sucursal.");
            setSucursal(sucursalData);
            
            const { summary, dateRange, entries } = await getFlujoWeeklySummary(sucursalId, selectedDate);
            setWeeklySummary(summary);
            setWeekDateRange(dateRange);

            const combinedHistory: UnifiedHistoryItem[] = [];
            
            entries.forEach(entry => {
                if (entry.type === 'transfer_out_to_central') {
                     combinedHistory.push({
                        id: entry.id,
                        date: entry.date,
                        type: 'transfer_out_to_central',
                        description: `Envío a Caja Chica`,
                        amount: -entry.amount,
                        raw: entry,
                        userPerformed: entry.userPerformed,
                    });
                } else {
                    combinedHistory.push({
                        id: entry.id,
                        date: entry.date,
                        type: 'flujo',
                        description: `Registro de flujo del día`,
                        amount: entry.totalCobrado,
                        details: `Fondo: ${formatCurrency(entry.fondo)} | Debe Entregar: ${formatCurrency(entry.debeEntregar)} | Falla: ${formatCurrency(entry.falla)} | Recuperado: ${formatCurrency(entry.recuperado)} | Entrantes: ${formatCurrency(entry.entrantes)} | Salientes: ${formatCurrency(entry.salientes)}`,
                        raw: entry
                    });
                }
            });

            if (summary) {
                summary.gastos.forEach(gasto => {
                    combinedHistory.push({
                        id: `gasto-${gasto.id}`,
                        date: new Date(gasto.date), // Convert ISO string back to Date
                        type: 'gasto',
                        description: `Gasto: ${gasto.description}`,
                        amount: -gasto.amount,
                        raw: gasto
                    });
                });
                
                summary.ventas.forEach(venta => {
                    combinedHistory.push({
                        id: `venta-${venta.id}`,
                        date: new Date(venta.date), // Convert ISO string back to Date
                        type: 'venta',
                        description: `Venta: ${venta.description}`,
                        amount: -venta.amount,
                        raw: venta
                    });
                });

                if (summary.comisiones > 0) {
                    combinedHistory.push({
                        id: `comision-${summary.id}`,
                        date: summary.weekEndDate,
                        type: 'comision',
                        description: "Comisiones de la semana",
                        amount: -summary.comisiones,
                        raw: { comisiones: summary.comisiones }
                    });
                }
            }
            
            combinedHistory.sort((a, b) => b.date.getTime() - a.date.getTime());
            setWeeklyHistory(combinedHistory);


        } catch (e: any) {
            if (e.message && (e.message.includes('requires an index'))) {
                const isBuilding = e.message.includes('currently building');
                setFirestoreError(isBuilding ? 'building' : e.message);
            } else {
              toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudo cargar la sucursal.' });
            }
        } finally {
            setIsLoading(false);
        }
    }, [sucursalId, toast, selectedDate]);

    React.useEffect(() => {
      fetchData();
    }, [fetchData]);

    const handleFormSubmit = async (data: Omit<FlujoEntry, 'id' | 'sucursalId' | 'date'>) => {
      setIsSubmitting(true);
      try {
          const entryData = { ...data, sucursalId, date: selectedDate };
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
          await addGastoToSummary(weeklySummary.id, gasto, sucursalId);
          toast({ title: 'Éxito', description: 'Gasto agregado.' });
          fetchData(); 
      } catch(e: any) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el gasto.' });
      }
    }

    const handleDeleteGasto = async (gasto: FlujoGasto) => {
      if (!weeklySummary) return;
      try {
          await deleteGastoFromSummary(weeklySummary.id, gasto.id);
          toast({ title: 'Éxito', description: 'Gasto eliminado.' });
          fetchData(); 
      } catch(e: any) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el gasto.' });
      }
    }
    
      const handleSaveVenta = async (venta: { amount: number, description: string }) => {
      if (!weeklySummary) return;
      try {
          await addVentaToSummary(weeklySummary.id, venta, sucursalId);
          toast({ title: 'Éxito', description: 'Venta agregada.' });
          fetchData(); 
      } catch(e: any) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la venta.' });
      }
    }

    const handleDeleteVenta = async (venta: FlujoVenta) => {
      if (!weeklySummary) return;
      try {
          await deleteVentaFromSummary(weeklySummary.id, venta.id);
          toast({ title: 'Éxito', description: 'Venta eliminada.' });
          fetchData(); 
      } catch(e: any) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la venta.' });
      }
    }

    const handleSaveComisiones = async (amount: number) => {
       if (!weeklySummary) return;
        try {
          await updateComisionesInSummary(weeklySummary.id, amount, sucursalId);
          toast({ title: 'Éxito', description: 'Comisiones guardadas.' });
          fetchData();
      } catch(e: any) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron guardar las comisiones.' });
      }
    }

    const handleDeleteComisiones = async () => {
      if (!weeklySummary) return;
      try {
        await updateComisionesInSummary(weeklySummary.id, 0, sucursalId);
        toast({ title: 'Éxito', description: 'Comisiones restablecidas a cero.' });
        fetchData();
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron eliminar las comisiones.' });
      }
    }
    
    const handleResetWeek = async () => {
      if (!weeklySummary) return;
      setIsReseting(true);
      try {
          await resetWeeklySummary(weeklySummary.id);
          toast({ title: "Éxito", description: "Resumen de la semana reiniciado."});
          fetchData();
      } catch (e: any) {
          toast({ variant: "destructive", title: "Error", description: e.message || "No se pudo reiniciar el resumen."});
      } finally {
          setIsReseting(false);
          setShowResetDialog(false);
      }
    }

    const handleTransferSubmit = async (amount: number): Promise<boolean> => {
        if (!user || !sucursal) return false;
        try {
            await transferToCentral({
                sucursalId: sucursal.id,
                sucursalName: sucursal.name,
                prefix: sucursal.prefix,
                amount: amount,
                userPerformed: user.name || user.username
            });
            toast({ title: "Éxito", description: "Fondos transferidos a la Caja Chica."});
            fetchData();
            return true;
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message || "No se pudo completar la transferencia."});
            return false;
        }
    }
    
    const handlePreviousWeek = () => {
      setSelectedDate(prevDate => addDays(prevDate, -7));
    };

    const handleNextWeek = () => {
      setSelectedDate(prevDate => addDays(prevDate, 7));
    };
    
    const handleCurrentWeek = () => {
      setSelectedDate(new Date());
    }

    const isNextWeekDisabled = isSameDay(startOfWeek(selectedDate, { weekStartsOn: 6 }), startOfWeek(new Date(), { weekStartsOn: 6 })) || selectedDate > new Date();
    
    const totalGastos = weeklySummary?.gastos.reduce((acc, g) => acc + g.amount, 0) ?? 0;
    const totalVentas = weeklySummary?.ventas.reduce((acc, v) => acc + v.amount, 0) ?? 0;
    const totalComisiones = weeklySummary?.comisiones ?? 0;
    const totalCobrado = weeklySummary?.totalCobradoSemanal ?? 0;
    const totalEfectivo = totalCobrado - totalComisiones - totalGastos - totalVentas;

    const canDelete = hasPermission('flujo', 'CAN_DELETE');
    
    const formatCurrency = (value?: number) => {
      const amount = typeof value === 'number' ? value : 0;
      return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };


    if (isLoading) {
      return <div className="flex h-full items-center justify-center"><Loader2 className="mr-2 h-8 w-8 animate-spin" />Cargando datos de la sucursal...</div>;
    }
    
    if (firestoreError) {
      const isBuilding = firestoreError === 'building';
      return (
          <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {isBuilding ? 'Índice de Base de Datos en Construcción' : 'Error de Base de Datos'}
              </AlertTitle>
              <AlertDescription>
                   {isBuilding ? (
                     <p>El índice necesario para esta vista se está creando. Esto puede tardar unos minutos. Por favor, espera un poco y <a href="#" onClick={() => window.location.reload()} className="font-bold underline">actualiza la página</a>.</p>
                  ) : (
                     <p>Se requiere un índice de Firestore para realizar esta consulta. Por favor, crea el índice usando el enlace que aparece en la consola de desarrollador de tu navegador y luego actualiza esta página.</p>
                  )}
                  <p className="mt-2 text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded-md overflow-x-auto whitespace-pre-wrap">{firestoreError}</p>
              </AlertDescription>
          </Alert>
      );
    }


    if (!sucursal) {
      return <div className="text-center py-10">No se encontró la sucursal.</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Panel de Flujo: {sucursal.name}</h1>
                <p className="text-xl font-semibold text-primary mt-1">{weekDateRange}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <CardTitle>Ingreso de Datos</CardTitle>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full sm:w-auto", !selectedDate && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <FlujoSucursalEntryForm
                                onSubmit={handleFormSubmit}
                                isSubmitting={isSubmitting}
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6 lg:col-span-1">
                     <div className="space-y-2">
                         <div className="grid grid-cols-2 gap-2">
                            <Button onClick={handlePreviousWeek} variant="outline"><ChevronLeft className="mr-2 h-4 w-4"/> Anterior</Button>
                            <Button onClick={handleNextWeek} variant="outline" disabled={isNextWeekDisabled}>Siguiente <ChevronRight className="ml-2 h-4 w-4"/></Button>
                         </div>
                          <Button onClick={handleCurrentWeek} variant="ghost" className="w-full" disabled={isNextWeekDisabled}>
                            <History className="mr-2 h-4 w-4"/> Volver a Semana Actual
                         </Button>
                     </div>
                    {weeklySummary ? (
                        <Card>
                            <CardHeader>
                                <div>
                                    <CardTitle>Resumen de la Semana</CardTitle>
                                </div>
                            </CardHeader>
                             <CardContent className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 p-4 rounded-lg bg-green-500/10 text-green-700">
                                    <p className="text-sm font-medium flex items-center gap-2"><TrendingUp/> Total Cobrado</p>
                                    <p className="text-xl font-bold">{formatCurrency(totalCobrado)}</p>
                                </div>
                                <div className="col-span-1 p-4 rounded-lg bg-orange-500/10 text-orange-700 cursor-pointer hover:bg-orange-500/20" onClick={() => setShowComisionesDialog(true)}>
                                    <p className="text-sm font-medium flex items-center gap-2"><Coins/> Comisiones</p>
                                    <p className="text-xl font-bold">{formatCurrency(totalComisiones)}</p>
                                </div>
                                <div className="col-span-1 p-4 rounded-lg bg-red-500/10 text-red-700 cursor-pointer hover:bg-red-500/20" onClick={() => setShowGastosDialog(true)}>
                                    <p className="text-sm font-medium flex items-center gap-2"><TrendingDown/> Gastos</p>
                                    <p className="text-xl font-bold">{formatCurrency(totalGastos)}</p>
                                </div>
                                 <div className="col-span-2 p-4 rounded-lg bg-purple-500/10 text-purple-700 cursor-pointer hover:bg-purple-500/20" onClick={() => setShowVentasDialog(true)}>
                                    <p className="text-sm font-medium flex items-center gap-2"><Receipt/> Venta</p>
                                    <p className="text-xl font-bold">{formatCurrency(totalVentas)}</p>
                                </div>
                                 <Card className="col-span-2 bg-blue-500/10 text-blue-700 shadow-inner">
                                    <CardHeader className="p-4">
                                        <p className="text-sm font-medium flex items-center gap-2"><Wallet/> Total Efectivo</p>
                                        <p className="text-2xl font-bold">{formatCurrency(totalEfectivo)}</p>
                                    </CardHeader>
                                    <CardFooter className="p-2 border-t">
                                        <Button variant="ghost" className="w-full h-8 text-blue-700 hover:text-blue-800 hover:bg-blue-500/20" onClick={() => setShowTransferDialog(true)}>
                                            <Send className="mr-2 h-4 w-4"/> Transferir a Caja Chica
                                        </Button>
                                    </CardFooter>
                                 </Card>
                            </CardContent>
                             <CardFooter>
                                  {canDelete && (
                                    <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="w-full">
                                                <RefreshCcw className="mr-2 h-4 w-4"/> Reiniciar Semana
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitleComponent>¿Reiniciar Resumen?</AlertDialogTitleComponent>
                                                <AlertDialogDescription>
                                                    Esta acción eliminará los gastos, ventas y pondrá las comisiones en cero para la semana actual. Los registros de flujo no se verán afectados.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooterComponent>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleResetWeek} disabled={isReseting}>
                                                    {isReseting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                                    Sí, reiniciar
                                                </AlertDialogAction>
                                            </AlertDialogFooterComponent>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                             </CardFooter>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="pt-6 text-center text-muted-foreground">
                                No hay registros para la semana seleccionada.
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historial de la Semana</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                        <span>Movimientos registrados para este período.</span>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <WeeklyHistoryList 
                        items={weeklyHistory} 
                        canDelete={canDelete} 
                        onDeleteEntry={handleDeleteEntry}
                        onDeleteGasto={(gasto) => handleDeleteGasto(gasto.raw as FlujoGasto)}
                        onDeleteComisiones={handleDeleteComisiones}
                        onDeleteVenta={(venta) => handleDeleteVenta(venta.raw as FlujoVenta)}
                    />
                </CardContent>
            </Card>
            
            {weeklySummary && (
                <Dialog open={showGastosDialog} onOpenChange={setShowGastosDialog}>
                    <ManagementDialog
                        title="Gestión de Gastos de la Semana"
                        description="Añade los gastos realizados durante esta semana. Se descontarán del total cobrado."
                        items={weeklySummary.gastos}
                        onSave={handleSaveGasto}
                        onDelete={(gastoId) => handleDeleteGasto({ id: gastoId, amount: 0, description: '', date: new Date()})}
                        onClose={() => setShowGastosDialog(false)}
                        canDelete={canDelete}
                    />
                </Dialog>
            )}
            
            {weeklySummary && (
                <Dialog open={showVentasDialog} onOpenChange={setShowVentasDialog}>
                    <ManagementDialog
                        title="Gestión de Ventas de la Semana"
                        description="Añade las ventas realizadas durante esta semana. Se descontarán del total cobrado."
                        items={weeklySummary.ventas}
                        onSave={handleSaveVenta}
                        onDelete={(ventaId) => handleDeleteVenta({ id: ventaId, amount: 0, description: '', date: new Date()})}
                        onClose={() => setShowVentasDialog(false)}
                        canDelete={canDelete}
                    />
                </Dialog>
            )}

            {weeklySummary && (
                 <Dialog open={showComisionesDialog} onOpenChange={setShowComisionesDialog}>
                    <ComisionesDialog summary={weeklySummary} onSave={handleSaveComisiones} onClose={() => setShowComisionesDialog(false)} />
                </Dialog>
            )}

             {weeklySummary && (
                 <TransferToCentralDialog
                    isOpen={showTransferDialog}
                    onClose={() => setShowTransferDialog(false)}
                    onSubmit={handleTransferSubmit}
                    maxAmount={totalEfectivo}
                />
            )}
        </div>
    );
}
