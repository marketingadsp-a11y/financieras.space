
"use client";

import * as React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getSucursalById, getSucursalTransactions, getSucursalStats, performSucursalTransaction } from "@/services/income-expenses-service";
import type { Sucursal, SucursalTransaction } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Banknote, Landmark, ArrowDown, ArrowUp, PlusCircle, Send, TrendingUp, TrendingDown, Trash2, PiggyBank, Briefcase, MoveHorizontal, User, CalendarIcon, FilterX, FileText } from "lucide-react";
import Link from "next/link";
import { SucursalTransactionDialog } from "./sucursal-transaction-dialog";
import { TransferDialog } from "./transfer-dialog";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";


const StatCard = ({ title, value, icon: Icon, description, colorClass = 'text-primary', children }: { title: string; value: number; icon: React.ElementType, description: string, colorClass?: string, children?: React.ReactNode }) => (
    <Card className="shadow-sm flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className={cn("h-4 w-4 text-muted-foreground", colorClass)} />
        </CardHeader>
        <CardContent className="flex-grow">
            <div className={cn("text-3xl font-bold", colorClass)}>
                ${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
        {children && <CardFooter>{children}</CardFooter>}
    </Card>
);

const ActionCard = ({ title, description, icon: Icon, onClick, disabled }: { title: string; description: string; icon: React.ElementType, onClick: () => void, disabled?: boolean }) => (
    <Card
        onClick={!disabled ? onClick : undefined}
        className={cn(
            "group flex flex-col items-center justify-center text-center p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
            disabled ? "cursor-not-allowed bg-muted/50" : "cursor-pointer"
        )}
    >
        <div className="p-4 bg-primary/10 rounded-full mb-4">
            <Icon className="h-8 w-8 text-primary transition-transform duration-300 group-hover:scale-110" />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
    </Card>
);


const TransactionRow = ({ tx }: { tx: SucursalTransaction }) => {
    const typeInfo = {
        deposit: { label: "Ingreso", icon: ArrowUp, color: "text-green-500", bg: "bg-green-500/10" },
        expense: { label: "Gasto", icon: ArrowDown, color: "text-red-500", bg: "bg-red-500/10" },
        transfer_to_loan_balance: { label: "Transferencia", icon: MoveHorizontal, color: "text-blue-500", bg: "bg-blue-500/10" },
    };

    const info = typeInfo[tx.type];
    const descriptionTitle = tx.category ? tx.category : tx.type === 'transfer_to_loan_balance' ? 'Transferencia a Caja de Préstamo' : tx.type;

    return (
         <div className="flex items-center space-x-4 rounded-lg bg-muted/40 p-4">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", info.bg)}>
                <info.icon className={cn("h-5 w-5", info.color)} />
            </div>
            <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none capitalize">{descriptionTitle}</p>
                <p className="text-sm text-muted-foreground">{tx.description}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="h-3 w-3" /> Movimiento de: {tx.userPerformed}</p>
            </div>
            <div className="flex flex-col items-end space-x-4">
                <div className={cn("font-semibold", info.color)}>
                   ${tx.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
                 <p className="text-xs text-muted-foreground">{format(tx.date, "dd MMM yyyy, p", { locale: es })}</p>
            </div>
        </div>
    );
};


export function SucursalPanel({ sucursalId }: { sucursalId: string }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [sucursal, setSucursal] = React.useState<Sucursal | null>(null);
    const [stats, setStats] = React.useState({ totalIncome: 0, totalExpenses: 0 });
    const [transactions, setTransactions] = React.useState<SucursalTransaction[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isTransactionDialogOpen, setTransactionDialogOpen] = React.useState(false);
    const [isTransferDialogOpen, setTransferDialogOpen] = React.useState(false);
    const [startDate, setStartDate] = React.useState<Date | undefined>();
    const [endDate, setEndDate] = React.useState<Date | undefined>();
    
    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const [sucursalData, transactionsData, statsData] = await Promise.all([
                getSucursalById(sucursalId),
                getSucursalTransactions(sucursalId),
                getSucursalStats(sucursalId)
            ]);
            setSucursal(sucursalData);
            setTransactions(transactionsData);
            setStats(statsData);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudieron cargar los datos de la sucursal.' });
        } finally {
            setIsLoading(false);
        }
    }, [sucursalId, toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredTransactions = React.useMemo(() => {
        return transactions.filter(tx => {
            const txDate = tx.date;
            if (startDate && txDate < startDate) return false;
            if (endDate) {
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                if (txDate > endOfDay) return false;
            }
            return true;
        });
    }, [transactions, startDate, endDate]);
    
    const handleTransaction = async (data: {type: 'expense' | 'deposit', amount: number, description: string, category?: string, executive?: string}) => {
        if (!user?.name) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo identificar al usuario." });
            return false;
        }
        try {
            await performSucursalTransaction({
                sucursalId,
                userPerformed: user.name,
                ...data
            });
            toast({ title: "Éxito", description: "Transacción realizada correctamente." });
            await fetchData();
            return true;
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error en la transacción", description: e.message });
            return false;
        }
    };
    
    const handleTransfer = async (amount: number) => {
         if (!user?.name) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo identificar al usuario." });
            return false;
        }
        try {
            await performSucursalTransaction({
                sucursalId,
                userPerformed: user.name,
                type: 'transfer_to_loan_balance',
                amount,
                description: 'Transferencia de Caja Chica a Caja de Préstamo'
            });
            toast({ title: "Éxito", description: "Transferencia realizada correctamente." });
            await fetchData();
            return true;
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error en la transferencia", description: e.message });
            return false;
        }
    }

    const exportToPDF = () => {
        if (!sucursal || filteredTransactions.length === 0) {
            toast({ variant: "destructive", title: "Sin datos", description: "No hay transacciones para exportar en el rango de fechas seleccionado." });
            return;
        }
        const doc = new jsPDF();
        const totals = filteredTransactions.reduce((acc, tx) => {
            if (tx.type === 'deposit') acc.deposits += tx.amount;
            if (tx.type === 'expense') acc.expenses += tx.amount;
            return acc;
        }, { deposits: 0, expenses: 0 });

        doc.text(`Historial de Transacciones - ${sucursal.name}`, 14, 16);
        doc.text(`Desde: ${startDate ? format(startDate, "PPP", { locale: es }) : 'Inicio'}`, 14, 22);
        doc.text(`Hasta: ${endDate ? format(endDate, "PPP", { locale: es }) : 'Fin'}`, 14, 28);
        doc.text(`Total Ingresos: $${totals.deposits.toLocaleString()}`, 14, 34);
        doc.text(`Total Gastos: $${totals.expenses.toLocaleString()}`, 14, 40);

        autoTable(doc, {
            startY: 46,
            head: [['Fecha', 'Tipo', 'Descripción', 'Realizado Por', 'Monto']],
            body: filteredTransactions.map(tx => {
                const typeLabels = { deposit: 'Ingreso', expense: 'Gasto', transfer_to_loan_balance: 'Transferencia' };
                return [
                    format(tx.date, "dd/MM/yy p", { locale: es }),
                    typeLabels[tx.type],
                    `${tx.category ? `[${tx.category}] ` : ''}${tx.description}`,
                    tx.userPerformed,
                    `$${tx.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                ];
            }),
        });
        doc.save(`Historial_${sucursal.name}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    if (isLoading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="mr-2 h-8 w-8 animate-spin" />Cargando datos de la sucursal...</div>;
    }

    if (!sucursal) {
        return <div className="text-center py-10">No se encontró la sucursal. <Link href="/tools/income-expenses" className="text-primary hover:underline">Volver</Link></div>
    }

    return (
        <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Panel de Sucursal: {sucursal.name}</h1>
                 <Button variant="ghost" size="icon" onClick={fetchData}>
                    <RefreshCw className="h-5 w-5 text-muted-foreground" />
                </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Ingresos Totales (Caja Chica)" value={stats.totalIncome} icon={TrendingUp} description="Total de ingresos de la sucursal" colorClass="text-green-500" />
                <StatCard title="Gastos Totales (Caja Chica)" value={stats.totalExpenses} icon={TrendingDown} description="Total de gastos de la sucursal" colorClass="text-red-500" />
                <StatCard title="Caja Chica" value={sucursal.currentBalance} icon={PiggyBank} description="Dinero disponible para gastos">
                    <Button className="w-full" size="sm" onClick={() => setTransferDialogOpen(true)}>
                        <Send className="mr-2 h-4 w-4"/>
                        Transferir a Prestar
                    </Button>
                </StatCard>
                <StatCard title="Caja para Prestar" value={sucursal.loanBalance || 0} icon={Briefcase} description="Dinero disponible para préstamos" />
            </div>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <ActionCard title="Registrar Movimiento" description="Ingresos y Gastos" icon={PlusCircle} onClick={() => setTransactionDialogOpen(true)} />
                <ActionCard title="Solicitar Préstamo" description="A central u otra sucursal" icon={Landmark} onClick={() => {}} disabled />
                <ActionCard title="Enviar a Capital" description="Devolver fondos a central" icon={Send} onClick={() => {}} disabled />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div>
                            <CardTitle>Historial de Transacciones</CardTitle>
                            <CardDescription>Movimientos de ingresos y gastos de la sucursal.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                           <Popover>
                                <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full md:w-auto", !startDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4"/>
                                    {startDate ? format(startDate, "PPP", { locale: es }) : "Fecha de Inicio"}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus/></PopoverContent>
                           </Popover>
                           <Popover>
                                <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full md:w-auto", !endDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4"/>
                                    {endDate ? format(endDate, "PPP", { locale: es }) : "Fecha de Fin"}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus/></PopoverContent>
                           </Popover>
                           <Button variant="ghost" size="icon" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}><FilterX className="h-4 w-4"/></Button>
                           <Button variant="outline" onClick={exportToPDF} disabled={filteredTransactions.length === 0}><FileText className="h-4 w-4"/></Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                     {filteredTransactions.length > 0 ? filteredTransactions.map(tx => (
                        <TransactionRow key={tx.id} tx={tx} />
                     )) : (
                        <div className="text-center py-10 text-muted-foreground">No hay transacciones para el rango de fechas seleccionado.</div>
                     )}
                </CardContent>
            </Card>

            <SucursalTransactionDialog
                isOpen={isTransactionDialogOpen}
                onClose={() => setTransactionDialogOpen(false)}
                onSubmit={handleTransaction}
            />

            <TransferDialog
                isOpen={isTransferDialogOpen}
                onClose={() => setTransferDialogOpen(false)}
                onSubmit={handleTransfer}
                currentBalance={sucursal.currentBalance}
            />
        </div>
    )
}
