
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { getClienteById, getMovimientosByCliente, getOficinaById, deleteCliente, addPaymentToCliente, updateCliente } from "@/services/mensuales-service";
import type { ClienteMensual, MovimientoMensual, OficinaMensual } from "@/lib/data";
import { Loader2, ArrowLeft, User, DollarSign, Percent, Calendar, Briefcase, FileText, Trash2, CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDesc,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PagoForm } from "./pago-form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";


const StatCard = ({ title, value, isCurrency = true, colorClass = "text-foreground" }: { title: string; value: number; isCurrency?: boolean; colorClass?: string; }) => (
    <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className={cn("text-2xl font-bold", colorClass)}>
            {isCurrency ? `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : value}
        </p>
    </div>
);

const MovimientoItem = ({ movimiento }: { movimiento: MovimientoMensual }) => {
    const typeInfo: { [key: string]: { label: string; color: string } } = {
        initial_loan: { label: "Préstamo Inicial", color: "text-primary" },
        charge_interest: { label: "Cargo de Interés", color: "text-amber-600" },
        pago_capital: { label: "Abono a Capital", color: "text-green-600" },
        pago_interes: { label: "Pago a Interés", color: "text-orange-500" },
    };

    const info = typeInfo[movimiento.type as keyof typeof typeInfo] || { label: 'Movimiento', color: 'text-muted-foreground' };

    return (
         <div className="flex items-center justify-between p-3 border-b">
            <div>
                 <p className={cn("font-semibold", info.color)}>{info.label}</p>
                 {movimiento.notes && <p className="text-xs text-muted-foreground">{movimiento.notes}</p>}
                <p className="text-xs text-muted-foreground">{format(movimiento.date, "PPP p", { locale: es })}</p>
            </div>
            <p className={cn("text-lg font-mono", info.color)}>${movimiento.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
    )
};


export function PrestamoDetail({ clienteId }: { clienteId: string }) {
    const { toast } = useToast();
    const router = useRouter();
    const [cliente, setCliente] = React.useState<ClienteMensual | null>(null);
    const [oficina, setOficina] = React.useState<OficinaMensual | null>(null);
    const [movimientos, setMovimientos] = React.useState<MovimientoMensual[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isPagoFormOpen, setIsPagoFormOpen] = React.useState(false);

    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const clienteData = await getClienteById(clienteId);
            setCliente(clienteData);

            if (clienteData) {
                const [movimientosData, oficinaData] = await Promise.all([
                    getMovimientosByCliente(clienteId),
                    clienteData.oficinaId ? getOficinaById(clienteData.oficinaId) : Promise.resolve(null),
                ]);
                setMovimientos(movimientosData);
                setOficina(oficinaData);
            } else {
                 setCliente(null);
                 setMovimientos([]);
                 setOficina(null);
            }

        } catch (error) {
            console.error("Error fetching loan details:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los detalles del préstamo." });
            setCliente(null);
        } finally {
            setIsLoading(false);
        }
    }, [clienteId, toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDelete = async () => {
        if (!cliente) return;
        setIsDeleting(true);
        try {
            await deleteCliente(cliente.id);
            toast({ title: "Éxito", description: "El préstamo y todos sus movimientos han sido eliminados." });
            router.push('/tools/mensuales');
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el préstamo." });
            setIsDeleting(false);
        }
    };
    
    const handlePaymentSubmit = async (amount: number) => {
        if (!cliente) return;

        try {
            await addPaymentToCliente(cliente.id, amount);
            toast({ title: "Éxito", description: "Abono registrado correctamente." });
            setIsPagoFormOpen(false);
            fetchData(); // Refresh all data
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo registrar el abono." });
        }
    };

    const handleDateChange = async (newDate: Date) => {
        if (!cliente) return;
        try {
            await updateCliente(cliente.id, { registrationDate: newDate });
            toast({ title: 'Éxito', description: 'Fecha de registro actualizada.' });
            fetchData(); // Refresh data
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la fecha.' });
        }
    }

    const handleExportPDF = () => {
        if (!cliente) {
            toast({ variant: "destructive", title: "Error", description: "No hay datos del cliente para exportar." });
            return;
        }

        const doc = new jsPDF();
        const dateStr = format(new Date(), "PPP p", { locale: es });

        // --- PDF Header ---
        doc.setFontSize(18);
        doc.text(`Detalle de Préstamo: ${cliente.name}`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`ID Cliente: ${cliente.displayId}`, 14, 28);
        doc.text(`Exportado el: ${dateStr}`, 14, 34);

        // --- Loan Details Table ---
        const detailsBody = [
            ["Oficina", oficina?.name || 'N/A'],
            ["Monto Original", `$${cliente.loanAmount.toLocaleString('es-MX')}`],
            ["Saldo Actual", `$${cliente.currentBalance.toLocaleString('es-MX')}`],
            ["Tasa de Interés", `${cliente.interestRateValue}% mensual`],
            ["Día de Pago", `${cliente.paymentDay} de cada mes`],
            ["Estado", cliente.status],
        ];
        autoTable(doc, {
            startY: 42,
            head: [['Concepto', 'Valor']],
            body: detailsBody,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
        });

        // --- Movements History Table ---
        if (movimientos.length > 0) {
            const lastY = (doc as any).lastAutoTable.finalY + 15;
            doc.setFontSize(14);
            doc.text("Historial de Movimientos", 14, lastY);
            
            const movementsBody = movimientos.map(mov => {
                const typeInfo = {
                    initial_loan: 'Préstamo Inicial',
                    charge_interest: 'Cargo de Interés',
                    pago_interes: 'Pago a Interés',
                    pago_capital: 'Abono a Capital',
                }[mov.type] || 'Movimiento';
                
                return [
                    format(mov.date, "dd/MM/yy p", { locale: es }),
                    typeInfo,
                    mov.notes,
                    `$${mov.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                ];
            });

            autoTable(doc, {
                startY: lastY + 6,
                head: [['Fecha', 'Tipo', 'Notas', 'Monto']],
                body: movementsBody,
                headStyles: { fillColor: [41, 128, 185] },
                columnStyles: { 3: { halign: 'right' } }
            });
        }
        
        doc.save(`Reporte_Prestamo_${cliente.name.replace(/\s/g, '_')}.pdf`);
    };


    const stats = React.useMemo(() => {
        return movimientos.reduce((acc, mov) => {
            if (mov.type === 'pago_capital') {
                acc.totalCapitalPaid += mov.amount;
            } else if (mov.type === 'pago_interes') {
                acc.totalInterestPaid += mov.amount;
            }
            return acc;
        }, { totalCapitalPaid: 0, totalInterestPaid: 0 });
    }, [movimientos]);
    
    if (isLoading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!cliente) {
        return (
            <div className="text-center py-10">
                <h2 className="text-xl font-semibold">Cliente no encontrado</h2>
                <p className="text-muted-foreground">El préstamo que buscas no existe o fue eliminado.</p>
                 <Button variant="outline" asChild className="mt-4">
                    <Link href="/tools/mensuales">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Prestamos
                    </Link>
                </Button>
            </div>
        )
    }

    const getStatusVariant = (status: ClienteMensual['status']) => {
        switch (status) {
            case 'vigente': return 'vigente';
            case 'vencido': return 'vencido';
            case 'liquidado': return 'default';
            default: return 'outline';
        }
    }

    return (
        <div className="space-y-6">
            <Button variant="outline" asChild>
                <Link href="/tools/mensuales">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Prestamos
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div>
                            <CardTitle className="text-3xl">{cliente.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                           <Dialog open={isPagoFormOpen} onOpenChange={setIsPagoFormOpen}>
                                <DialogTrigger asChild>
                                     <Button disabled={cliente.status === 'liquidado'}>
                                        <DollarSign className="mr-2 h-4 w-4" /> Registrar Abono
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Registrar Abono para {cliente.name}</DialogTitle>
                                        <DialogDesc>
                                            El interés total a cubrir se pagará primero. El resto se irá a capital.
                                        </DialogDesc>
                                    </DialogHeader>
                                    <PagoForm cliente={cliente} onSubmit={handlePaymentSubmit}/>
                                </DialogContent>
                            </Dialog>
                             <Badge variant={getStatusVariant(cliente.status) as any} className="text-base capitalize h-10">{cliente.status}</Badge>
                        </div>
                    </div>
                     <div className="pt-6">
                        <h3 className="text-lg font-semibold mb-2">Información del Préstamo</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 border rounded-lg">
                           <div className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary"/><div><p className="text-xs text-muted-foreground">Oficina</p><p className="font-medium">{oficina?.name || 'N/A'}</p></div></div>
                           <div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary"/><div><p className="text-xs text-muted-foreground">Interés Mensual</p><p className="font-medium">${cliente.monthlyInterestCharge.toLocaleString()}</p></div></div>
                           <div className="flex items-center gap-2"><Percent className="h-5 w-5 text-primary"/><div><p className="text-xs text-muted-foreground">Tasa de Interés</p><p className="font-medium">{cliente.interestRateValue}%</p></div></div>
                           <div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary"/><div><p className="text-xs text-muted-foreground">Día de Pago</p><p className="font-medium">{cliente.paymentDay} de cada mes</p></div></div>
                           <div className="flex items-center gap-2">
                                <CalendarClock className="h-5 w-5 text-primary"/>
                                <div>
                                    <p className="text-xs text-muted-foreground">Fecha de Registro</p>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="link" className="p-0 h-auto font-medium -ml-1">
                                                {cliente.registrationDate ? format(cliente.registrationDate, "PPP", { locale: es }) : 'No registrada'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <CalendarComponent
                                                mode="single"
                                                selected={cliente.registrationDate}
                                                onSelect={(date) => date && handleDateChange(date)}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                     {/* Resumen Financiero */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="Monto Original Prestado" value={cliente.loanAmount} />
                        <StatCard title="Total Pagado a Intereses" value={stats.totalInterestPaid} colorClass="text-orange-500"/>
                        <StatCard title="Total Pagado a Capital" value={stats.totalCapitalPaid} colorClass="text-green-600"/>
                        <StatCard title="Saldo Actual" value={cliente.currentBalance} colorClass="text-blue-600"/>
                    </div>
                   
                    {/* Historial de Movimientos */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Historial de Movimientos</h3>
                         <div className="border rounded-lg max-h-96 overflow-y-auto">
                            {movimientos.length > 0 ? (
                                movimientos.map(mov => <MovimientoItem key={mov.id} movimiento={mov} />)
                            ) : (
                                <div className="p-6 text-center text-muted-foreground">
                                    <FileText className="h-8 w-8 mx-auto mb-2" />
                                    No hay movimientos registrados para este préstamo.
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar Préstamo
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro de eliminar este préstamo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción es irreversible. Se eliminará permanentemente el préstamo de <strong>{cliente.name}</strong> y todo su historial de movimientos.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Sí, eliminar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                     <Button variant="outline" onClick={handleExportPDF}>
                        <FileText className="mr-2 h-4 w-4" /> Exportar a PDF
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

    