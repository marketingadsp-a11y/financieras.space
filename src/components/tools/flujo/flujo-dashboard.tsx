
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { FlujoSucursal, FlujoCentralAccount, FlujoWeeklySummary, FlujoCentralTransaction } from "@/lib/data";
import { getFlujoSummariesForWeek, addFlujoSucursal, updateFlujoSucursal, deleteFlujoSucursal, getFlujoExportData } from "@/services/flujo-service";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, ArrowRight, DollarSign, PiggyBank, Building, Edit, Trash2, ChevronLeft, ChevronRight, History, Wallet, Coins, TrendingUp, TrendingDown, Receipt, CalendarIcon, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FlujoSucursalForm } from "./sucursal-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { format, isSameDay, startOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { FlujoExportDialog } from "./flujo-export-dialog";
import { CajaChicaHistory } from "./caja-chica-history";

const StatCard = ({ title, value, icon: Icon, description, colorClass = 'text-primary' }: { title: string; value: number; icon: React.ElementType, description: string, colorClass?: string }) => {
    
    if (title === "Total Efectivo (Semanal)") {
        return (
             <Card className="bg-blue-500/10 text-blue-700 shadow-inner">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2"><Icon className="h-4 w-4"/>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-blue-700/80">{description}</p>
                </CardContent>
            </Card>
        )
    }

    if (title === "Caja Chica") {
        return (
             <Card className="bg-green-500/10 text-green-700 shadow-inner">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2"><Icon className="h-4 w-4"/>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-green-700/80">{description}</p>
                </CardContent>
            </Card>
        )
    }

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
        <div className={cn("text-3xl font-bold", colorClass)}>
            ${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    )
};

type SucursalSummary = FlujoSucursal & { summary: FlujoWeeklySummary | null };

const SucursalCard = ({ sucursalSummary, onEdit, onDelete }: { sucursalSummary: SucursalSummary, onEdit: (s: FlujoSucursal) => void, onDelete: (s: FlujoSucursal) => void }) => {
  const { summary, ...sucursal } = sucursalSummary;
  const totalCobrado = summary?.totalCobradoSemanal ?? 0;
  const totalComisiones = summary?.comisiones ?? 0;
  // Safely reduce, defaulting to 0 if the array is missing.
  const totalGastos = summary?.gastos?.reduce((acc, g) => acc + g.amount, 0) ?? 0;
  const totalVentas = summary?.ventas?.reduce((acc, v) => acc + v.amount, 0) ?? 0;
  const totalEfectivo = totalCobrado - totalComisiones - totalGastos - totalVentas;

  const formatCurrency = (value?: number) => {
    const amount = typeof value === 'number' ? value : 0;
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  return (
    <Card className="group flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg w-fit">
                  <Building className="h-6 w-6 text-primary" />
              </div>
              <div>
                  <CardTitle>{sucursal.name}</CardTitle>
                  <CardDescription>{sucursal.manager}</CardDescription>
              </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(sucursal)}><Edit className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(sucursal)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
          <div className="flex flex-wrap items-center gap-4">
              <div className="p-2 rounded-lg bg-green-500/10 text-green-700 flex-1 min-w-[120px]"><p className="text-xs font-medium flex items-center gap-1"><TrendingUp/> Cobrado</p><p className="text-md font-bold">{formatCurrency(totalCobrado)}</p></div>
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-700 flex-1 min-w-[120px]"><p className="text-xs font-medium flex items-center gap-1"><Coins/> Comisiones</p><p className="text-md font-bold">{formatCurrency(totalComisiones)}</p></div>
              <div className="p-2 rounded-lg bg-red-500/10 text-red-700 flex-1 min-w-[120px]"><p className="text-xs font-medium flex items-center gap-1"><TrendingDown/> Gastos</p><p className="text-md font-bold">{formatCurrency(totalGastos)}</p></div>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-700 flex-1 min-w-[120px]"><p className="text-xs font-medium flex items-center gap-1"><Receipt/> Venta</p><p className="text-md font-bold">{formatCurrency(totalVentas)}</p></div>
              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-700 flex-grow text-center"><p className="text-sm font-medium flex items-center justify-center gap-2"><Wallet/> Total Efectivo</p><p className="text-xl font-bold">{formatCurrency(totalEfectivo)}</p></div>
          </div>
      </CardContent>
      <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/tools/flujo/sucursal/${sucursal.id}`}>
                Ir al Panel <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
      </CardFooter>
    </Card>
  );
};


export function FlujoDashboard() {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [account, setAccount] = React.useState<FlujoCentralAccount | null>(null);
  const [sucursalSummaries, setSucursalSummaries] = React.useState<SucursalSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Form and Dialog state
  const [isFormOpen, setFormOpen] = React.useState(false);
  const [editingSucursal, setEditingSucursal] = React.useState<FlujoSucursal | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Delete dialog state
  const [sucursalToDelete, setSucursalToDelete] = React.useState<FlujoSucursal | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = React.useState('');

  // Date filtering state
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [weekDateRange, setWeekDateRange] = React.useState('');
  
  // Export state
  const [isExporting, setIsExporting] = React.useState(false);
  const [isExportDialogOpen, setExportDialogOpen] = React.useState(false);


  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const summary = await getFlujoSummariesForWeek(user.prefix, selectedDate);
      setAccount(summary.centralAccount);
      setSucursalSummaries(summary.sucursalSummaries);
      setWeekDateRange(summary.dateRange);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos de Flujo.'});
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, toast, selectedDate]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalEfectivoSemanal = React.useMemo(() => {
    return sucursalSummaries.reduce((acc, s) => {
        if (!s.summary) return acc;
        const totalCobrado = s.summary.totalCobradoSemanal ?? 0;
        const totalComisiones = s.summary.comisiones ?? 0;
        const totalGastos = s.summary.gastos?.reduce((acc, g) => acc + g.amount, 0) ?? 0;
        const totalVentas = s.summary.ventas?.reduce((acc, v) => acc + v.amount, 0) ?? 0;
        const totalEfectivo = totalCobrado - totalComisiones - totalGastos - totalVentas;
        return acc + totalEfectivo;
    }, 0);
  }, [sucursalSummaries]);

  const handleFormSubmit = async (data: Omit<FlujoSucursal, 'id' | 'prefix' | 'currentBalance'>) => {
    if (!user?.prefix) return;
    setIsSubmitting(true);
    try {
      if (editingSucursal) {
        await updateFlujoSucursal(editingSucursal.id, data);
        toast({ title: 'Éxito', description: 'Sucursal actualizada.' });
      } else {
        await addFlujoSucursal({ ...data, prefix: user.prefix });
        toast({ title: 'Éxito', description: 'Sucursal creada.' });
      }
      closeForm();
      fetchData();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la sucursal.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async () => {
    if (!sucursalToDelete) return;
    try {
        await deleteFlujoSucursal(sucursalToDelete.id);
        toast({ title: 'Éxito', description: 'Sucursal eliminada.' });
        closeDeleteDialog();
        fetchData();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo eliminar la sucursal.' });
    }
  }
  
  const openForm = (sucursal: FlujoSucursal | null) => {
    setEditingSucursal(sucursal);
    setFormOpen(true);
  }
  const closeForm = () => {
    setEditingSucursal(null);
    setFormOpen(false);
  }
  
  const openDeleteDialog = (sucursal: FlujoSucursal) => {
    setSucursalToDelete(sucursal);
  }
  const closeDeleteDialog = () => {
    setSucursalToDelete(null);
    setDeleteConfirmationText('');
  }
  
  const handlePreviousWeek = () => setSelectedDate(prevDate => addDays(prevDate, -7));
  const handleNextWeek = () => setSelectedDate(prevDate => addDays(prevDate, 7));
  const handleCurrentWeek = () => setSelectedDate(new Date());
  const isNextWeekDisabled = isSameDay(startOfWeek(selectedDate, { weekStartsOn: 6 }), startOfWeek(new Date(), { weekStartsOn: 6 })) || selectedDate > new Date();

  const handleExport = async (sucursalIds: string[], startDate: Date | null, endDate: Date | null, formatType: 'pdf' | 'excel') => {
    if (!user?.prefix) return;
    setIsExporting(true);
    try {
        const data = await getFlujoExportData(user.prefix, sucursalIds, startDate, endDate);
        if (formatType === 'pdf') generatePDF(data);
        else generateExcel(data);
        toast({ title: 'Éxito', description: 'Reporte generado.' });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudo generar el reporte.' });
    } finally {
        setIsExporting(false);
        setExportDialogOpen(false);
    }
  }
  
  const generatePDF = (data: Awaited<ReturnType<typeof getFlujoExportData>>) => {
      const doc = new jsPDF();
      const { sucursales, dateRange } = data;
      doc.text(`Reporte de Flujo`, 14, 16);
      doc.text(`Periodo: ${dateRange}`, 14, 22);

      sucursales.forEach((sucursal, index) => {
          if (index > 0) doc.addPage();
          doc.text(`Sucursal: ${sucursal.name} (${sucursal.manager})`, 14, 16);
          const body = sucursal.weeklySummaries.map(s => ([
              s.weekId,
              `$${s.totalCobradoSemanal.toLocaleString()}`,
              `$${s.comisiones.toLocaleString()}`,
              `$${s.gastos.reduce((a,c) => a+c.amount, 0).toLocaleString()}`,
              `$${s.ventas.reduce((a,c) => a+c.amount, 0).toLocaleString()}`,
              `$${s.totalEfectivo.toLocaleString()}`,
          ]));
          autoTable(doc, {
              head: [['Semana', 'Cobrado', 'Comisiones', 'Gastos', 'Venta', 'Total Efectivo']],
              body,
              startY: 20
          });
      });
      doc.save('Reporte_Flujo.pdf');
  }

  const generateExcel = (data: Awaited<ReturnType<typeof getFlujoExportData>>) => {
      const wb = XLSX.utils.book_new();
      data.sucursales.forEach(sucursal => {
          const ws_data = sucursal.weeklySummaries.map(s => ({
              'Semana': s.weekId,
              'Cobrado': s.totalCobradoSemanal,
              'Comisiones': s.comisiones,
              'Gastos': s.gastos.reduce((a,c) => a+c.amount, 0),
              'Venta': s.ventas.reduce((a,c) => a+c.amount, 0),
              'Total Efectivo': s.totalEfectivo,
          }));
          const ws = XLSX.utils.json_to_sheet(ws_data);
          XLSX.utils.book_append_sheet(wb, ws, sucursal.name.substring(0, 30));
      });
      XLSX.writeFile(wb, 'Reporte_Flujo.xlsx');
  }

  if (isLoading && !account) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="mr-2 h-8 w-8 animate-spin" />Cargando datos de Flujo...</div>;
  }
  
  const displayAccount = account || { totalEfectivo: 0, cajaChica: 0, transactions: [] };
  const expectedConfirmationText = sucursalToDelete ? `BORRAR ${sucursalToDelete.name}` : '';
  const canExport = hasPermission('flujo', 'CAN_EXPORT');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Panel de Flujo</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <StatCard title="Caja Chica" value={displayAccount.cajaChica} icon={PiggyBank} description="Dinero en la cuenta principal." />
        <StatCard title="Total Efectivo (Semanal)" value={totalEfectivoSemanal} icon={Wallet} description="Suma de todas las sucursales esta semana." colorClass="text-blue-600" />
      </div>

      <CajaChicaHistory transactions={displayAccount.transactions || []} />

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <CardTitle>Sucursales de Flujo</CardTitle>
                    <CardDescription>Gestiona las diferentes sucursales y sus fondos.</CardDescription>
                </div>
                 <div className="flex flex-col sm:flex-row items-center gap-2">
                    <p className="text-lg font-semibold text-primary">{weekDateRange}</p>
                    <div className="flex items-center gap-1">
                        <Button onClick={handlePreviousWeek} variant="outline" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4"/></Button>
                        <Button onClick={handleCurrentWeek} variant="outline" size="icon" className="h-8 w-8" disabled={isNextWeekDisabled}><History className="h-4 w-4"/></Button>
                        <Button onClick={handleNextWeek} variant="outline" size="icon" className="h-8 w-8" disabled={isNextWeekDisabled}><ChevronRight className="h-4 w-4"/></Button>
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent>
             <div className="flex justify-end gap-2 mb-4">
                 {canExport && <Button variant="outline" onClick={() => setExportDialogOpen(true)}><Download className="mr-2 h-4 w-4"/>Exportar</Button>}
                 <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => openForm(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Registrar Sucursal
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingSucursal ? 'Editar' : 'Registrar'} Sucursal</DialogTitle>
                        </DialogHeader>
                        <FlujoSucursalForm 
                            onSubmit={handleFormSubmit}
                            sucursal={editingSucursal}
                            isSubmitting={isSubmitting}
                        />
                    </DialogContent>
                </Dialog>
            </div>
            {isLoading ? (
                <div className="flex justify-center items-center h-40"><Loader2 className="mr-2 h-8 w-8 animate-spin" />Cargando sucursales...</div>
            ) : sucursalSummaries.length > 0 ? (
                <div className="space-y-6">
                    {sucursalSummaries.map(s => <SucursalCard key={s.id} sucursalSummary={s} onEdit={() => openForm(s)} onDelete={() => openDeleteDialog(s)} />)}
                </div>
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    <p>No hay sucursales creadas para esta herramienta.</p>
                </div>
            )}
        </CardContent>
      </Card>
      
      <AlertDialog open={!!sucursalToDelete} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitleComponent>¿Estás seguro de eliminar esta sucursal?</AlertDialogTitleComponent>
                <AlertDialogDescription>
                    Esta acción es irreversible y eliminará la sucursal. El balance de la sucursal no se devolverá a la caja chica.
                    Para confirmar, escribe <strong className="text-foreground">{expectedConfirmationText}</strong>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder={expectedConfirmationText}
                autoFocus
            />
            <AlertDialogFooterComponent>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleteConfirmationText !== expectedConfirmationText}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    Sí, eliminar sucursal
                </AlertDialogAction>
            </AlertDialogFooterComponent>
        </AlertDialogContent>
      </AlertDialog>

      <FlujoExportDialog 
        isOpen={isExportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        sucursales={sucursalSummaries}
        onExport={handleExport}
        isExporting={isExporting}
      />
    </div>
  );
}
