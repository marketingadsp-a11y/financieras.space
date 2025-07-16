
"use client";

import * as React from "react";
import {
  ArrowRight,
  Banknote,
  Building,
  Landmark,
  MinusCircle,
  PlusCircle,
  RefreshCw,
  Send,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CentralAccount, Sucursal } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const ActionButton = ({
  icon: Icon,
  title,
  description,
  variant = "default",
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  variant?: "default" | "destructive" | "primary";
}) => {
  const colors = {
    default: "text-green-500 bg-green-500/10",
    destructive: "text-red-500 bg-red-500/10",
    primary: "text-primary bg-primary/10",
  }

  return (
    <div className="flex-1 rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${colors[variant]}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
};

const SucursalCard = ({ sucursal }: { sucursal: Sucursal }) => {
  return (
    <Card className="flex flex-col text-center transition-all hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="items-center">
        <Avatar className="h-16 w-16 mb-2">
            <AvatarImage src={sucursal.logoUrl} alt={sucursal.name} data-ai-hint="logo company" />
            <AvatarFallback>{sucursal.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-lg">{sucursal.name}</CardTitle>
          <CardDescription>{sucursal.manager}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="rounded-lg bg-muted p-4">
            <p className="text-xs text-muted-foreground tracking-widest">FONDO ACTUAL</p>
            <p className="text-4xl font-bold text-primary">${sucursal.currentBalance.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
        </div>
      </CardContent>
      <CardFooter className="p-4">
        <Button className="w-full bg-primary/90 hover:bg-primary" size="lg">
            <Banknote className="mr-2" />
            Administrar Panel
        </Button>
      </CardFooter>
    </Card>
  );
};

// Placeholder data - we will replace this with real data later
const placeholderAccount: CentralAccount = {
    id: 'central-1',
    currentBalance: 64100.00,
    assignedCapital: 630000.00,
    totalBranchBalance: 443400.00,
};

const placeholderSucursales: Sucursal[] = [
    { id: 's1', name: 'La Fortuna', manager: 'Daniel', currentBalance: 300000.00, logoUrl: 'https://placehold.co/64x64.png' },
    { id: 's2', name: 'La Quinta', manager: 'Alejandro', currentBalance: 93000.00, logoUrl: 'https://placehold.co/64x64.png' },
    { id: 's3', name: 'San Luis', manager: 'Alejandro', currentBalance: 50400.00, logoUrl: 'https://placehold.co/64x64.png' },
];


export function IncomeExpensesDashboard() {
  const { user } = useAuth();
  const [account, setAccount] = React.useState<CentralAccount>(placeholderAccount);
  const [sucursales, setSucursales] = React.useState<Sucursal[]>(placeholderSucursales);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <Button variant="ghost" size="icon">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Capital Card */}
        <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-base font-normal text-muted-foreground">Capital Central</CardTitle>
                <p className="text-5xl font-bold text-green-600">${account.currentBalance.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
                <CardDescription>Fondos disponibles para asignar. Haga clic para ver historial y acciones.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                <ActionButton icon={PlusCircle} title="Ingresar Fondos" description="Añadir a Capital Central" />
                <ActionButton icon={MinusCircle} title="Retirar Fondos" description="Desde Capital Central" variant="destructive" />
                <ActionButton icon={Send} title="Asignar a Sucursal" description="Enviar fondos" variant="primary"/>
            </CardContent>
        </Card>
        
        {/* Side Stat Cards */}
        <div className="col-span-1 space-y-6">
            <StatCard 
                title="Capital Asignado" 
                value={`$${account.assignedCapital.toLocaleString('es-MX')}`} 
                icon={Send}
                description="Total histórico enviado a sucursales."
            />
             <StatCard 
                title="Balance en Sucursales" 
                value={`$${account.totalBranchBalance.toLocaleString('es-MX')}`} 
                icon={Landmark}
                description="Suma de balances de todas las sucursales."
            />
        </div>
      </div>

      {/* Sucursales Summary */}
       <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">Resumen de Sucursales</h2>
              <Button variant="ghost">
                Ver Todas <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {sucursales.map(s => (
                    <SucursalCard key={s.id} sucursal={s} />
                ))}
            </div>
        </CardContent>
       </Card>

    </div>
  );
}
