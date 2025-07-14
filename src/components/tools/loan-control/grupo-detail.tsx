
"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Users, PlusCircle, User, Phone, MapPin, Hash, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { getGrupoById } from "@/services/loan-control-service";
import { getCustomersByLoanControlGroup, addCustomer } from "@/services/customer-service";
import type { LoanControlGrupo, Customer } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CustomerForm } from "@/components/tools/overdue-portfolio/customer-form";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const StatCard = ({ title, value, isCurrency = false }: { title: string; value: number; isCurrency?: boolean }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
            {isCurrency ? `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}
        </div>
      </CardContent>
    </Card>
);

const CustomerInfoCard = ({ customer }: { customer: Customer }) => {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle>{customer.name}</CardTitle>
                    <Badge variant={customer.status === 'Pagado' ? 'secondary' : 'destructive'}>{customer.status}</Badge>
                </div>
                <CardDescription className="flex items-center gap-2 pt-1">
                    <MapPin className="h-4 w-4"/> {customer.address}, {customer.colonia}, {customer.cp}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <h4 className="font-semibold">Información del Cliente</h4>
                        <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/> <span>{customer.phone}</span></div>
                    </div>
                     <div className="space-y-2">
                        <h4 className="font-semibold">Información del Préstamo</h4>
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground"/> <span>{customer.fechaPrestamo ? format(new Date(customer.fechaPrestamo), 'PPP', {locale: es}) : 'N/A'}</span></div>
                        <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground"/> <span>Préstamo: ${customer.loanAmount.toLocaleString()}</span></div>
                        <div className="flex items-center gap-2 font-bold text-destructive"><DollarSign className="h-4 w-4"/> <span>Saldo: ${customer.dueAmount.toLocaleString()}</span></div>
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div className="space-y-2">
                        <h4 className="font-semibold">Información del Aval</h4>
                         <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground"/> <span>{customer.guarantor || 'N/A'}</span></div>
                         <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/> <span>{customer.guarantorPhone || 'N/A'}</span></div>
                    </div>
                     <div className="space-y-2">
                        <h4 className="font-semibold">Dirección del Aval</h4>
                         <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground"/> <span>{customer.direccionAval || 'N/A'}</span></div>
                         <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground"/> <span>{customer.coloniaAval}, {customer.cpAval}</span></div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button variant="outline" className="w-full">Administrar Cliente</Button>
            </CardFooter>
        </Card>
    )
}

export function LoanControlGrupoDetail({ grupoId, plazaId, carteraId }: { grupoId: string, plazaId: string, carteraId: string }) {
  const { user } = useAuth();
  const [grupo, setGrupo] = React.useState<LoanControlGrupo | null>(null);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const { toast } = useToast();

  const fetchGrupoData = React.useCallback(async () => {
      try {
        setIsLoading(true);
        const [grupoData, customersData] = await Promise.all([
          getGrupoById(grupoId),
          getCustomersByLoanControlGroup(grupoId),
        ]);
        setGrupo(grupoData);
        setCustomers(customersData);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información del grupo." });
      } finally {
        setIsLoading(false);
      }
  }, [grupoId, toast]);

  React.useEffect(() => {
    fetchGrupoData();
  }, [fetchGrupoData]);

  const handleFormSubmit = async (values: Omit<Customer, 'id' | 'plazaId' | 'status' | 'loanControlGroupId' | 'prefix'>) => {
    if (!user?.prefix) return;
    try {
        await addCustomer({
            ...values,
            plazaId,
            prefix: user.prefix,
            loanControlGroupId: grupoId,
            status: 'Pendiente',
            fechaPrestamo: values.fechaPrestamo ? new Date(values.fechaPrestamo) : new Date(),
        });
        toast({ title: "Éxito", description: "Cliente agregado al grupo." });
        setIsFormOpen(false);
        await fetchGrupoData();
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo agregar el cliente." });
    }
  };
  
  const summary = React.useMemo(() => {
    return customers.reduce((acc, customer) => {
        acc.totalPrestado += customer.loanAmount;
        acc.totalPendiente += customer.dueAmount;
        return acc;
    }, { totalPrestado: 0, totalPendiente: 0});
  }, [customers]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando información del grupo...</span>
      </div>
    );
  }
  
  if (!grupo) {
     return <div className="text-center">No se encontró el grupo.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Grupo: {grupo.name}</h1>
        <p className="text-muted-foreground">
          Visualiza el resumen y el listado de clientes de este grupo.
        </p>
      </div>
      
       <div className="grid gap-4 md:grid-cols-2">
            <StatCard title="Total Prestado" value={summary.totalPrestado} isCurrency />
            <StatCard title="Total Pendiente" value={summary.totalPendiente} isCurrency />
       </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/>Clientes del Grupo</CardTitle>
                <CardDescription>
                    {customers.length} cliente(s) en este grupo.
                </CardDescription>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Agregar Cliente
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Agregar Cliente a {grupo.name}</DialogTitle>
                    </DialogHeader>
                    <CustomerForm
                        onSubmit={handleFormSubmit}
                    />
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customers.length > 0 ? (
                customers.map(customer => <CustomerInfoCard key={customer.id} customer={customer} />)
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    No hay clientes registrados en este grupo.
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
