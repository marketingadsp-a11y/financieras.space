
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { VisorSupervisor } from "@/lib/data";
import { getSupervisors, addSupervisor, updateSupervisor, deleteSupervisor } from "@/services/visor-app-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, User, ArrowRight, Edit, Trash2, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SupervisorForm } from "./supervisor-form";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function VisorAppDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [supervisors, setSupervisors] = React.useState<VisorSupervisor[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingSupervisor, setEditingSupervisor] = React.useState<VisorSupervisor | null>(null);
  const [supervisorToDelete, setSupervisorToDelete] = React.useState<VisorSupervisor | null>(null);

  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getSupervisors(user.prefix);
      setSupervisors(data);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los supervisores." });
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFormSubmit = async (data: Omit<VisorSupervisor, 'id' | 'prefix'>) => {
    if (!user?.prefix) return;
    try {
      if (editingSupervisor) {
        await updateSupervisor(editingSupervisor.id, data);
        toast({ title: "Éxito", description: "Supervisor actualizado." });
      } else {
        await addSupervisor({ ...data, prefix: user.prefix });
        toast({ title: "Éxito", description: "Supervisor creado." });
      }
      setIsFormOpen(false);
      setEditingSupervisor(null);
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el supervisor." });
    }
  };
  
  const handleDelete = async () => {
    if (!supervisorToDelete) return;
    try {
      await deleteSupervisor(supervisorToDelete.id);
      toast({ title: "Éxito", description: "Supervisor y sus clientes eliminados." });
      fetchData();
      setSupervisorToDelete(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el supervisor." });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando supervisores...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
            <h1 className="text-3xl font-bold tracking-tight">VisorApp Dashboard</h1>
            <p className="text-muted-foreground">
                Gestiona los supervisores y los clientes que tienen asignados.
            </p>
            </div>
            <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingSupervisor(null); }}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Supervisor
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>{editingSupervisor ? "Editar" : "Agregar"} Supervisor</DialogTitle>
                </DialogHeader>
                <SupervisorForm onSubmit={handleFormSubmit} supervisor={editingSupervisor} />
            </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
           {supervisors.length > 0 ? (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre del Supervisor</TableHead>
                                <TableHead>Usuario (Código de Acceso)</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {supervisors.map(supervisor => (
                                <TableRow key={supervisor.id}>
                                    <TableCell className="font-medium">{supervisor.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-mono text-sm">{supervisor.accessCode}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                         <Button asChild variant="outline" size="sm">
                                            <Link href={`/tools/visor-app/supervisor/${supervisor.id}`}>
                                                Ver Panel <ArrowRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingSupervisor(supervisor); setIsFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setSupervisorToDelete(supervisor)}><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium">No hay supervisores</h3>
                    <p className="mt-1 text-sm">Comienza agregando el primer supervisor.</p>
                </div>
            )}
      </CardContent>

      <AlertDialog open={!!supervisorToDelete} onOpenChange={(open) => !open && setSupervisorToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción eliminará al supervisor "{supervisorToDelete?.name}" y a todos sus clientes asignados. Esta acción no se puede deshacer.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Sí, eliminar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
