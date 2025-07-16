
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
  Loader2
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CentralAccount, Sucursal, CentralAccountTransaction } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { getIncomeExpensesSummary, performCentralAccountTransaction } from "@/services/income-expenses-service";
import { TransactionDialog } from "./transaction-dialog";
import { RecentTransactions } from "./recent-transactions";

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
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  variant?: "default" | "destructive" | "primary";
  onClick?: () => void;
}) => {
  const colors = {
    default: "text-green-500 bg-green-500/10",
    destructive: "text-red-500 bg-red-500/10",
    primary: "text-primary bg-primary/10",
  }

  return (
    <div 
        className="flex-1 rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
        onClick={onClick}
    >
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
        <Button className="w-full bg-primary/90 hover:bg-primary" size="lg" disabled>
            <Banknote className="mr-2" />
            Administrar Panel
        </Button>
      </CardFooter>
    </Card>
  );
};


export function IncomeExpensesDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [account, setAccount] = React.useState<CentralAccount | null>(null);
  const [sucursales, setSucursales] = React.useState<Sucursal[]>([]);
  const [transactions, setTransactions] = React.useState<CentralAccountTransaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'deposit' | 'withdrawal' | 'assignment'>('deposit');
  
  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const summary = await getIncomeExpensesSummary(user.prefix);
      setAccount(summary.centralAccount);
      setSucursales(summary.sucursales);
      setTransactions(summary.transactions);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos del dashboard.'});
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (mode: 'deposit' | 'withdrawal' | 'assignment') => {
    setDialogMode(mode);
    setDialogOpen(true);
  };
  
  const handleTransaction = async (amount: number, sucursalId?: string, description?: string) => {
    if (!user?.prefix || !user?.name) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo identificar al usuario o la cuenta." });
      return false;
    }
    try {
      await performCentralAccountTransaction({
        prefix: user.prefix,
        accountId: user.prefix,
        type: dialogMode,
        amount,
        sucursalId,
        userPerformed: user.name,
        description,
      });
      toast({ title: "Éxito", description: "Transacción realizada correctamente."});
      await fetchData(); // Refresh data
      return true; // Indicate success to close dialog
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error en la transacción", description: e.message });
      return false; // Indicate failure
    }
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="mr-2 h-8 w-8 animate-spin" />Cargando dashboard...</div>;
  }

  // Use a default account structure if none exists yet, allowing the first transaction to create it.
  const displayAccount = account || {
    id: user?.prefix || 'default',
    currentBalance: 0,
    assignedCapital: 0,
    totalBranchBalance: 0
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard de Gastos e Ingresos</h1>
        <Button variant="ghost" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Capital Card */}
        <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-base font-normal text-muted-foreground">Capital Central</CardTitle>
                <p className="text-5xl font-bold text-green-600">${(displayAccount.currentBalance || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
                <CardDescription>Fondos disponibles para asignar. Haga clic en las acciones para ver el historial.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                <ActionButton icon={PlusCircle} title="Ingresar Fondos" description="Añadir a Capital Central" onClick={() => handleOpenDialog('deposit')} />
                <ActionButton icon={MinusCircle} title="Retirar Fondos" description="Desde Capital Central" variant="destructive" onClick={() => handleOpenDialog('withdrawal')} />
                <ActionButton icon={Send} title="Asignar a Sucursal" description="Enviar fondos" variant="primary" onClick={() => handleOpenDialog('assignment')}/>
            </CardContent>
        </Card>
        
        {/* Side Stat Cards */}
        <div className="col-span-1 space-y-6">
            <StatCard 
                title="Capital Asignado" 
                value={`$${(displayAccount.assignedCapital || 0).toLocaleString('es-MX')}`} 
                icon={Send}
                description="Total histórico enviado a sucursales."
            />
             <StatCard 
                title="Balance en Sucursales" 
                value={`$${(displayAccount.totalBranchBalance || 0).toLocaleString('es-MX')}`} 
                icon={Landmark}
                description="Suma de balances de todas las sucursales."
            />
        </div>
      </div>

      <RecentTransactions transactions={transactions} />

      {/* Sucursales Summary */}
       <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">Resumen de Sucursales</h2>
              <Button variant="ghost" asChild>
                <Link href="/tools/income-expenses/sucursales">
                    Gestionar Sucursales <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
        </CardHeader>
        <CardContent>
            {sucursales.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {sucursales.map(s => (
                        <SucursalCard key={s.id} sucursal={s} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    <p>No hay sucursales creadas para este prefijo.</p>
                    <Button variant="link" asChild><Link href="/tools/income-expenses/sucursales">Crear la primera sucursal</Link></Button>
                </div>
            )}
        </CardContent>
       </Card>

        <TransactionDialog 
            isOpen={isDialogOpen}
            onClose={() => setDialogOpen(false)}
            mode={dialogMode}
            onSubmit={handleTransaction}
            sucursales={sucursales}
            currentBalance={displayAccount.currentBalance}
        />

    </div>
  );
}
