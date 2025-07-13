
"use client";

import * as React from "react";
import Link from "next/link";
import { DollarSign, Users, UserCheck, Percent, Building, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { Plaza } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { getPlazas } from "@/services/plaza-service";
import { getCustomersByPlaza } from "@/services/customer-service";
import { useToast } from "@/hooks/use-toast";


const StatCard = ({ title, value, icon: Icon, isCurrency = false }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">
                {isCurrency ? `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}
            </div>
        </CardContent>
    </Card>
);

const DestructiveStatCard = ({ title, value, icon: Icon, isCurrency = false }) => (
     <Card className="bg-destructive/90 text-destructive-foreground">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-destructive-foreground/70" />
        </CardHeader>
        <CardContent>
            <div className="text-3xl font-bold">
                {isCurrency ? `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}
            </div>
        </CardContent>
    </Card>
)

const PlazaCard = ({ plaza }: { plaza: Plaza }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-5 w-5 text-muted-foreground" />
                {plaza.name}
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <p className="text-sm text-muted-foreground">Deuda Pendiente</p>
                <p className="text-2xl font-bold text-destructive">
                    ${plaza.pendingDebt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            </div>
            <div>
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Tasa de Recuperación</span>
                    <span>{plaza.recoveryRate.toFixed(1)}%</span>
                </div>
                <Progress value={plaza.recoveryRate} aria-label={`${plaza.recoveryRate}% de recuperación`} />
            </div>
            <Button asChild className="w-full">
               <Link href={`/tools/overdue-portfolio/plaza/${plaza.id}`}>
                    Ver Detalles <ArrowRight className="ml-2" />
                </Link>
            </Button>
        </CardContent>
    </Card>
);


export function ToolsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [plazas, setPlazas] = React.useState<Plaza[]>([]);
    const [summary, setSummary] = React.useState({ totalDebt: 0, totalClients: 0, recoveredClients: 0, recoveryRate: 0, totalLoan: 0 });
    const [isLoading, setIsLoading] = React.useState(true);


    React.useEffect(() => {
        if (user && !user.isSuperAdmin && !user.isToolAdmin && !user.accessibleTools?.includes('cartera-vencida')) {
            router.push('/');
        } else {
             const fetchData = async () => {
                if (!user) return;
                try {
                    setIsLoading(true);

                    // SuperAdmins and ToolAdmins should see all plazas, others see their prefixed ones.
                    const shouldFetchAll = user.isSuperAdmin || user.isToolAdmin;
                    const plazasFromDb = await getPlazas({ prefix: user.prefix, fetchAll: shouldFetchAll });
                    setPlazas(plazasFromDb);

                    let totalDebt = 0;
                    let totalLoan = 0;
                    let totalClients = 0;

                    for(const plaza of plazasFromDb) {
                        const customers = await getCustomersByPlaza(plaza.id);
                        const plazaTotalLoan = customers.reduce((acc, c) => acc + c.loanAmount, 0);
                        totalDebt += plaza.pendingDebt;
                        totalLoan += plazaTotalLoan;
                        totalClients += customers.length;
                    }
                    
                    const totalPaid = totalLoan - totalDebt;
                    const recoveryRate = totalLoan > 0 ? (totalPaid / totalLoan) * 100 : 0;
                    const recoveredClients = plazasFromDb.length > 0 ? Math.round(totalClients * (recoveryRate / 100)) : 0; // Simple estimation

                    setSummary({
                        totalDebt,
                        totalClients,
                        recoveredClients,
                        recoveryRate,
                        totalLoan,
                    });

                } catch (error) {
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: "No se pudieron cargar los datos del resumen.",
                    });
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [user, router, toast]);

    if (user && !user.isSuperAdmin && !user.isToolAdmin && !user.accessibleTools?.includes('cartera-vencida')) {
        return (
            <div className="flex h-full items-center justify-center">
                <p>No tienes acceso a esta herramienta.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Resumen General</h1>
                <p className="text-muted-foreground">Vista general de la cartera de clientes.</p>
            </div>

            {/* --- SECCIÓN DE RESUMEN GENERAL --- */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <DestructiveStatCard title="Deuda Total" value={summary.totalDebt} icon={DollarSign} isCurrency />
                <StatCard title="Clientes Totales" value={summary.totalClients} icon={Users} />
                <StatCard title="Recuperado" value={summary.totalLoan - summary.totalDebt} icon={UserCheck} isCurrency />
                <StatCard title="Tasa de Recuperación" value={`${summary.recoveryRate.toFixed(1)}%`} icon={Percent} />
            </div>

            {/* --- SECCIÓN DE CARTERA POR PLAZA --- */}
            <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Cartera por Plaza</h2>
            </div>
            {isLoading ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                    <span>Cargando plazas...</span>
                </div>
            ) : plazas.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {plazas.map((plaza) => (
                        <PlazaCard key={plaza.id} plaza={plaza} />
                    ))}
                </div>
            ) : (
                 <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">No hay plazas registradas. Comienza agregando una en la sección de "Gestionar Plazas".</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
