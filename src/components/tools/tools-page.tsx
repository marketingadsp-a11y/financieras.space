"use client";

import * as React from "react";
import { DollarSign, Users, UserCheck, Percent, Building, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { Plaza } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";

// --- DATOS DE EJEMPLO ---
const plazasData: Plaza[] = [
    { id: "1", name: "AUTLAN PREPA", pendingDebt: 105106.00, recoveryRate: 5.9 },
    { id: "2", name: "CREDIMEX", pendingDebt: 79250.00, recoveryRate: 0.0 },
    { id: "3", name: "EDUARDO UNION", pendingDebt: 18435.00, recoveryRate: 0.0 },
    { id: "4", name: "GRULLO OFICINA", pendingDebt: 496457.00, recoveryRate: 4.7 },
    { id: "5", name: "OFICINA CENTRO", pendingDebt: 1292794.00, recoveryRate: 6.0 },
    { id: "6", name: "RUTA AARON", pendingDebt: 34880.00, recoveryRate: 30.3 },
    { id: "7", name: "TECOLOTLAN", pendingDebt: 55925.00, recoveryRate: 0.0 },
    { id: "8", name: "UNION DE TULA", pendingDebt: 77324.00, recoveryRate: 11.8 },
];

const summaryData = {
    totalDebt: 2160171.00,
    totalClients: 324,
    recoveredClients: 24,
    recoveryRate: 7.4,
};
// --- FIN DE DATOS DE EJEMPLO ---


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
            <Button className="w-full">
                Ver Detalles <ArrowRight className="ml-2" />
            </Button>
        </CardContent>
    </Card>
);


export function ToolsPage() {
    const { user } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (user && !user.isSuperAdmin && !user.accessibleTools?.includes('cartera-vencida')) {
            router.push('/');
        }
    }, [user, router]);

    if (user && !user.isSuperAdmin && !user.accessibleTools?.includes('cartera-vencida')) {
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
                <Card className="bg-destructive/90 text-destructive-foreground">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Deuda Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-destructive-foreground/70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            ${summaryData.totalDebt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
                <StatCard title="Clientes Totales" value={summaryData.totalClients} icon={Users} />
                <StatCard title="Clientes Recuperados" value={summaryData.recoveredClients} icon={UserCheck} />
                <StatCard title="Tasa de Recuperación" value={`${summaryData.recoveryRate}%`} icon={Percent} />
            </div>

            {/* --- SECCIÓN DE CARTERA POR PLAZA --- */}
            <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Cartera por Plaza</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plazasData.map((plaza) => (
                    <PlazaCard key={plaza.id} plaza={plaza} />
                ))}
            </div>
        </div>
    );
}
