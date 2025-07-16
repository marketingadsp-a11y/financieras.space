
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getSucursalById, getSucursalTransactions, performSucursalTransaction } from "@/services/income-expenses-service";
import type { Sucursal, SucursalTransaction } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, RefreshCw, Banknote, Landmark, ArrowDown, ArrowUp, PlusCircle, MinusCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SucursalTransactionDialog } from "./sucursal-transaction-dialog";

const StatCard = ({ title, value, icon: Icon }: { title: string; value: number; icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
        </CardContent>
    </Card>
);

const transactionTypes = {
  deposit: { label: "Depósito", icon: ArrowUp, color: "text-green-500", badge: "secondary" },
  withdrawal: { label: "Retiro", icon: ArrowDown, color: "text-blue-500", badge: "default" },
  expense: { label: "Gasto", icon: ArrowDown, color: "text-red-500", badge: "destructive" },
};

export function SucursalPanel({ sucursalId }: { sucursalId: string }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [sucursal, setSucursal] = React.useState<Sucursal | null>(null);
    const [transactions, setTransactions] = React.useState<SucursalTransaction[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isDialogOpen, setDialogOpen] = React.useState(false);
    const [dialogMode, setDialogMode] = React.useState<'expense' | 'deposit'>('expense');

    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const [sucursalData, transactionsData] = await Promise.all([
                getSucursalById(sucursalId),
                getSucursalTransactions(sucursalId)
            ]);
            setSucursal(sucursalData);
            setTransactions(transactionsData);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudieron cargar los datos de la sucursal.' });
        } finally {
            setIsLoading(false);
        }
    }, [sucursalId, toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenDialog = (mode: 'expense' | 'deposit') => {
        setDialogMode(mode);
        setDialogOpen(true);
    };
    
    const handleTransaction = async (amount: number, description: string) => {
        if (!user?.name) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo identificar al usuario." });
            return false;
        }
        try {
            await performSucursalTransaction({
                sucursalId,
                type: dialogMode,
                amount,
                userPerformed: user.name,
                description,
            });
            toast({ title: "Éxito", description: "Transacción realizada correctamente." });
            await fetchData();
            return true;
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error en la transacción", description: e.message });
            return false;
        }
    };

    const monthlyStats = React.useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return transactions.reduce((acc, tx) => {
            if (tx.date >= startOfMonth) {
                if (tx.type === 'expense') acc.expenses += tx.amount;
                if (tx.type === 'deposit') acc.deposits += tx.amount;
            }
            return acc;
        }, { expenses: 0, deposits: 0 });
    }, [transactions]);


    if (isLoading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="mr-2 h-8 w-8 animate-spin" />Cargando datos de la sucursal...</div>;
    }

    if (!sucursal) {
        return <div className="text-center py-10">No se encontró la sucursal. <Link href="/tools/income-expenses" className="text-primary hover:underline">Volver</Link></div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Button variant="ghost" asChild className="-ml-4">
                        <Link href="/tools/income-expenses"><ArrowLeft className="mr-2 h-4 w-4"/> Volver al Dashboard</Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">{sucursal.name}</h1>
                    <p className="text-muted-foreground">Panel de control de la sucursal.</p>
                </div>
                 <Button variant="ghost" size="icon" onClick={fetchData}>
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base font-normal text-muted-foreground">Balance Actual</CardTitle>
                        <p className="text-5xl font-bold text-primary">${(sucursal.currentBalance || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <Button className="flex-1" onClick={() => handleOpenDialog('expense')}>
                            <MinusCircle className="mr-2"/> Registrar Gasto
                        </Button>
                        <Button className="flex-1" variant="outline" onClick={() => handleOpenDialog('deposit')}>
                            <PlusCircle className="mr-2"/> Registrar Depósito Interno
                        </Button>
                    </CardContent>
                </Card>
                <StatCard title="Gastos (este mes)" value={monthlyStats.expenses} icon={ArrowDown} />
                <StatCard title="Depósitos (este mes)" value={monthlyStats.deposits} icon={ArrowUp} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Movimientos Recientes</CardTitle>
                    <CardDescription>Últimas transacciones realizadas en esta sucursal.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Realizado Por</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length > 0 ? transactions.map(tx => {
                                const typeInfo = transactionTypes[tx.type];
                                return (
                                    <TableRow key={tx.id}>
                                        <TableCell>{format(tx.date, 'dd MMM, yyyy', { locale: es })}</TableCell>
                                        <TableCell><Badge variant={typeInfo.badge as any}><typeInfo.icon className="mr-1 h-3 w-3" />{typeInfo.label}</Badge></TableCell>
                                        <TableCell>{tx.description}</TableCell>
                                        <TableCell className="text-muted-foreground">{tx.userPerformed}</TableCell>
                                        <TableCell className={`text-right font-semibold ${typeInfo.color}`}>${tx.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">No hay transacciones todavía.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <SucursalTransactionDialog
                isOpen={isDialogOpen}
                onClose={() => setDialogOpen(false)}
                mode={dialogMode}
                onSubmit={handleTransaction}
                currentBalance={sucursal.currentBalance}
            />
        </div>
    )
}
