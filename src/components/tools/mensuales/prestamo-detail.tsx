
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { getClienteById, getMovimientosByCliente, getOficinaById } from "@/services/mensuales-service";
import type { ClienteMensual, MovimientoMensual, OficinaMensual } from "@/lib/data";
import { Loader2, ArrowLeft, User, DollarSign, Percent, Calendar, Briefcase, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";

const StatCard = ({ title, value, isCurrency = true, colorClass = "text-foreground" }: { title: string; value: number; isCurrency?: boolean; colorClass?: string; }) => (
    <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className={cn("text-2xl font-bold", colorClass)}>
            {isCurrency ? `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : value}
        </p>
    </div>
);

const MovimientoItem = ({ movimiento }: { movimiento: MovimientoMensual }) => {
    const typeInfo = {
        charge_interest: { label: "Cargo de Interés", color: "text-amber-600" },
        pay_interest: { label: "Pago a Interés", color: "text-blue-600" },
        pay_capital: { label: "Abono a Capital", color: "text-green-600" },
        initial_loan: { label: "Préstamo Inicial", color: "text-primary" },
    };

    const info = typeInfo[movimiento.type];

    return (
        <div className="flex items-center justify-between p-3 border-b">
            <div>
                <p className={cn("font-semibold", info.color)}>{info.label}</p>
                <p className="text-xs text-muted-foreground">{format(movimiento.date, "PPP p", { locale: es })}</p>
            </div>
            <p className={cn("text-lg font-mono", info.color)}>${movimiento.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
    );
};


export function PrestamoDetail({ clienteId }: { clienteId: string }) {
    const { toast } = useToast();
    const [cliente, setCliente] = React.useState<ClienteMensual | null>(null);
    const [oficina, setOficina] = React.useState<OficinaMensual | null>(null);
    const [movimientos, setMovimientos] = React.useState<MovimientoMensual[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [clienteData, movimientosData] = await Promise.all([
                    getClienteById(clienteId),
                    getMovimientosByCliente(clienteId),
                ]);

                if (clienteData) {
                    const oficinaData = await getOficinaById(clienteData.oficinaId);
                    setOficina(oficinaData);
                }
                
                setCliente(clienteData);
                setMovimientos(movimientosData);

            } catch (error) {
                toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los detalles del préstamo." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [clienteId, toast]);

    const stats = React.useMemo(() => {
        return movimientos.reduce((acc, mov) => {
            if (mov.type === 'pay_capital') {
                acc.totalCapitalPaid += mov.amount;
            } else if (mov.type === 'pay_interest') {
                acc.totalInterestPaid += mov.amount;
            }
            return acc;
        }, { totalCapitalPaid: 0, totalInterestPaid: 0 });
    }, [movimientos]);
    
    if (isLoading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!cliente) {
        return <div className="text-center py-10">Cliente no encontrado.</div>
    }

    const getStatusVariant = (status: ClienteMensual['status']) => {
        switch (status) {
            case 'vigente': return 'secondary';
            case 'vencido': return 'destructive';
            case 'liquidado': return 'default';
            default: return 'outline';
        }
    }

    return (
        <div className="space-y-6">
            <Button variant="outline" asChild>
                <Link href="/tools/mensuales">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-3xl">{cliente.name}</CardTitle>
                            <CardDescription>Detalles del préstamo y historial de movimientos.</CardDescription>
                        </div>
                        <Badge variant={getStatusVariant(cliente.status)} className="text-base capitalize">{cliente.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                     {/* Resumen Financiero */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="Saldo Capital" value={cliente.currentBalance} colorClass="text-destructive"/>
                        <StatCard title="Total Pagado a Capital" value={stats.totalCapitalPaid} colorClass="text-green-600"/>
                        <StatCard title="Total Pagado a Intereses" value={stats.totalInterestPaid} colorClass="text-blue-600" />
                        <StatCard title="Monto Original Prestado" value={cliente.loanAmount} />
                    </div>
                     {/* Detalles del Préstamo */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Información del Préstamo</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                           <div className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary"/><div><p className="text-xs text-muted-foreground">Oficina</p><p className="font-medium">{oficina?.name || 'N/A'}</p></div></div>
                           <div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary"/><div><p className="text-xs text-muted-foreground">Interés Mensual</p><p className="font-medium">${cliente.monthlyInterestCharge.toLocaleString()}</p></div></div>
                           <div className="flex items-center gap-2"><Percent className="h-5 w-5 text-primary"/><div><p className="text-xs text-muted-foreground">Tasa de Interés</p><p className="font-medium">{cliente.interestRateValue}%</p></div></div>
                           <div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary"/><div><p className="text-xs text-muted-foreground">Día de Pago</p><p className="font-medium">{cliente.paymentDay} de cada mes</p></div></div>
                        </div>
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
            </Card>
        </div>
    )
}
