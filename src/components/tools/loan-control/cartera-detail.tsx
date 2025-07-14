
"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Users, PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getCarteraById, getGruposByCartera, addGrupo, updateGrupo, deleteGrupo } from "@/services/loan-control-service";
import { getCustomersByLoanControlGroup } from "@/services/customer-service";
import type { LoanControlCartera, LoanControlGrupo, Customer } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GrupoForm } from "./grupo-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/auth-context";

type GrupoWithStats = LoanControlGrupo & {
    customerCount: number;
};

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

export function LoanControlCarteraDetail({ carteraId, plazaId }: { carteraId: string, plazaId: string }) {
  const { user } = useAuth();
  const [cartera, setCartera] = React.useState<LoanControlCartera | null>(null);
  const [grupos, setGrupos] = React.useState<GrupoWithStats[]>([]);
  const [allCustomers, setAllCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingGrupo, setEditingGrupo] = React.useState<LoanControlGrupo | null>(null);
  const { toast } = useToast();

  const fetchGruposAndCustomers = React.useCallback(async () => {
      try {
        setIsLoading(true);
        const [carteraData, gruposData] = await Promise.all([
             getCarteraById(carteraId),
             getGruposByCartera(carteraId)
        ]);

        setCartera(carteraData);
        
        const customerPromises = gruposData.map(grupo => getCustomersByLoanControlGroup(grupo.id));
        const customersByGroup = await Promise.all(customerPromises);
        
        const allCustomersFlat = customersByGroup.flat();
        setAllCustomers(allCustomersFlat);

        const gruposWithStats = gruposData.map((grupo, index) => ({
            ...grupo,
            customerCount: customersByGroup[index].length
        }));
        setGrupos(gruposWithStats);

      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información de la cartera." });
      } finally {
          setIsLoading(false);
      }
  }, [carteraId, toast]);

  React.useEffect(() => {
    fetchGruposAndCustomers();
  }, [fetchGruposAndCustomers]);

  const handleFormSubmit = async (values: Omit<LoanControlGrupo, 'id' | 'carteraId' | 'plazaId' | 'prefix'>) => {
    if (!user?.prefix) return;
    try {
        if (editingGrupo) {
            await updateGrupo(editingGrupo.id, { name: values.name });
            toast({ title: "Éxito", description: "Grupo actualizado." });
        } else {
            await addGrupo({ ...values, carteraId, plazaId, prefix: user.prefix });
            toast({ title: "Éxito", description: "Grupo creado." });
        }
        setIsFormOpen(false);
        setEditingGrupo(null);
        await fetchGruposAndCustomers();
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el grupo." });
    }
  };

  const handleEditClick = (grupo: LoanControlGrupo) => {
    setEditingGrupo(grupo);
    setIsFormOpen(true);
  };
  
  const handleDeleteClick = async (id: string) => {
    try {
        await deleteGrupo(id);
        toast({ title: "Éxito", description: "Grupo eliminado." });
        await fetchGruposAndCustomers();
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el grupo." });
    }
  }
  
  const summary = React.useMemo(() => {
    return allCustomers.reduce((acc, customer) => {
        acc.totalPrestado += customer.loanAmount;
        acc.totalPendiente += customer.dueAmount;
        return acc;
    }, { totalPrestado: 0, totalPendiente: 0});
  }, [allCustomers]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando información...</span>
      </div>
    );
  }
  
  if (!cartera) {
     return <div className="text-center">No se encontró la cartera.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cartera: {cartera.name}</h1>
        <p className="text-muted-foreground">
          Gestiona los grupos de clientes de esta cartera. Responsable: <span className="font-medium">{cartera.responsable}</span>
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
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/>Grupos</CardTitle>
                <CardDescription>
                    Organiza tus clientes en diferentes grupos dentro de la cartera.
                </CardDescription>
            </div>
            <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if(!open) setEditingGrupo(null);}}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Agregar Grupo
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingGrupo ? "Editar" : "Agregar"} Grupo</DialogTitle>
                    </DialogHeader>
                    <GrupoForm
                        onSubmit={handleFormSubmit}
                        grupo={editingGrupo}
                    />
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Grupo</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupos.length > 0 ? (
                  grupos.map((grupo) => (
                    <TableRow key={grupo.id}>
                      <TableCell className="font-medium">{grupo.name}</TableCell>
                      <TableCell>{grupo.customerCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                            <Button asChild size="sm" variant="outline">
                                <Link href={{pathname: `/tools/loan-control/grupo/${grupo.id}`, query: {plazaId, carteraId}}}>
                                    Gestionar Clientes <ArrowRight className="ml-2 h-4 w-4"/>
                                </Link>
                            </Button>
                            <AlertDialog>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Alternar menú</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                        <DropdownMenuItem onSelect={() => handleEditClick(grupo)}>
                                            <Pencil className="mr-2 h-4 w-4" /> Editar
                                        </DropdownMenuItem>
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        Esta acción eliminará el grupo y desvinculará a los clientes asociados. Esta acción no se puede deshacer.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteClick(grupo.id)}>Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No hay grupos registrados para esta cartera.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
