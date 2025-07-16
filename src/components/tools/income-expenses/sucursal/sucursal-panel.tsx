
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getSucursalById, getSucursalTransactions, performSucursalTransaction, getSucursalStats } from "@/services/income-expenses-service";
import type { Sucursal, SucursalTransaction } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, RefreshCw, Banknote, Landmark, ArrowDown, ArrowUp, PlusCircle, Send, TrendingUp, TrendingDown, Trash2, PiggyBank, Briefcase, MoveHorizontal } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SucursalTransactionDialog } from "./sucursal-transaction-dialog";
import { cn } from "@/lib/utils";


const StatCard = ({ title, value, icon: Icon, description, colorClass = 'text-primary' }: { title: string; value: number; icon: React.ElementType, description: string, colorClass?: string }) => (
    <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className={cn("h-4 w-4 text-muted-foreground", colorClass)} />
        </CardHeader>
        <CardContent>
            <div className={cn("text-3xl font-bold", colorClass)}>
                ${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
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
    };

    const info = typeInfo[tx.type];
    const descriptionTitle = tx.category ? tx.category : tx.type;
    const descriptionDetail = `Registrado por ${tx.userPerformed}`;


    return (
         <div className="flex items-center space-x-4 rounded-lg bg-muted/40 p-4">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", info.bg)}>
                <info.icon className={cn("h-5 w-5", info.color)} />
            </div>
            <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none capitalize">{descriptionTitle}</p>
                <p className="text-sm text-muted-foreground">{tx.description}</p>
            </div>
            <div className="flex items-center space-x-4">
                <div className={cn("font-semibold", info.color)}>
                   ${tx.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
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
    const [isDialogOpen, setDialogOpen] = React.useState(false);
    
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
                <StatCard title="Caja Chica" value={sucursal.currentBalance} icon={PiggyBank} description="Dinero disponible para gastos" />
                <StatCard title="Caja para Prestar" value={sucursal.loanBalance || 0} icon={Briefcase} description="Dinero disponible para préstamos" />
            </div>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <ActionCard title="Registrar Movimiento" description="Ingresos y Gastos" icon={PlusCircle} onClick={() => setDialogOpen(true)} />
                <ActionCard title="Solicitar Préstamo" description="A central u otra sucursal" icon={Landmark} onClick={() => {}} disabled />
                <ActionCard title="Enviar a Capital" description="Devolver fondos a central" icon={Send} onClick={() => {}} disabled />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historial de Transacciones (Caja Chica)</CardTitle>
                    <CardDescription>Últimos movimientos de ingresos y gastos de la sucursal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     {transactions.length > 0 ? transactions.map(tx => (
                        <TransactionRow key={tx.id} tx={tx} />
                     )) : (
                        <div className="text-center py-10 text-muted-foreground">No hay transacciones todavía.</div>
                     )}
                </CardContent>
            </Card>

            <SucursalTransactionDialog
                isOpen={isDialogOpen}
                onClose={() => setDialogOpen(false)}
                onSubmit={handleTransaction}
                currentBalance={sucursal.currentBalance}
            />
        </div>
    )
}
