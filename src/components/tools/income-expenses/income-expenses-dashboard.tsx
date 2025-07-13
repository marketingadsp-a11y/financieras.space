"use client";

import * as React from "react";
import {
  ArrowRight,
  Banknote,
  Building,
  Landmark,
  MinusCircle,
  PlusCircle,
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
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
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
  variant?: "default" | "destructive";
}) => {
  const iconColor =
    variant === "destructive" ? "text-red-500" : "text-green-500";
  return (
    <Button
      variant="outline"
      className="h-auto w-full justify-start p-4 text-left"
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted ${iconColor}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Button>
  );
};

const SucursalCard = ({ sucursal }: { sucursal: Sucursal }) => {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar>
            <AvatarImage src={sucursal.logoUrl} alt={sucursal.name} data-ai-hint="logo company" />
            <AvatarFallback>{sucursal.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-lg">{sucursal.name}</CardTitle>
          <CardDescription>{sucursal.manager}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
        <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">FONDO ACTUAL</p>
            <p className="text-3xl font-bold text-primary">${sucursal.currentBalance.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">
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
    currentBalance: 264100.00,
    assignedCapital: 530000.00,
    totalBranchBalance: 343400.00,
};

const placeholderSucursales: Sucursal[] = [
    { id: 's1', name: 'La Fortuna', manager: 'Daniel', currentBalance: 200000.00, logoUrl: 'https://placehold.co/40x40.png' },
    { id: 's2', name: 'La Quinta', manager: 'Alejandro', currentBalance: 93000.00, logoUrl: 'https://placehold.co/40x40.png' },
    { id: 's3', name: 'San Luis', manager: 'Alejandro', currentBalance: 50400.00, logoUrl: 'https://placehold.co/40x40.png' },
];


export function IncomeExpensesDashboard() {
  const { user } = useAuth();
  const [account, setAccount] = React.useState<CentralAccount>(placeholderAccount);
  const [sucursales, setSucursales] = React.useState<Sucursal[]>(placeholderSucursales);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hola {user?.username || 'Usuario'}, Bienvenido</h1>
        <p className="text-muted-foreground">
          Este es tu resumen general de las Sucursales.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Capital Card */}
        <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-base font-normal text-muted-foreground">Capital Central</CardTitle>
                <p className="text-4xl font-bold text-primary">${account.currentBalance.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
                <CardDescription>Fondos disponibles para asignar. Haga clic para ver historial y acciones.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ActionButton icon={PlusCircle} title="Ingresar Fondos" description="Añadir a Capital Central" />
                <ActionButton icon={MinusCircle} title="Retirar Fondos" description="Desde Capital Central" variant="destructive" />
                <ActionButton icon={Send} title="Asignar a Sucursal" description="Enviar fondos a una sucursal" />
            </CardContent>
        </Card>
        
        {/* Side Stat Cards */}
        <div className="col-span-1 space-y-6">
            <StatCard 
                title="Capital Asignado" 
                value={`$${account.assignedCapital.toLocaleString('es-MX', {minimumFractionDigits: 2})}`} 
                icon={Send}
                description="Total histórico enviado a sucursales."
            />
             <StatCard 
                title="Balance en Sucursales" 
                value={`$${account.totalBranchBalance.toLocaleString('es-MX', {minimumFractionDigits: 2})}`} 
                icon={Landmark}
                description="Suma de balances de todas las sucursales."
            />
        </div>
      </div>

      {/* Sucursales Summary */}
       <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Resumen de Sucursales</h2>
          <Button variant="ghost">
            Ver Todas <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sucursales.map(s => (
                <SucursalCard key={s.id} sucursal={s} />
            ))}
        </div>
       </div>

    </div>
  );
}
