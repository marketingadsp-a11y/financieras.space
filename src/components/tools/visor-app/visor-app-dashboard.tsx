
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { VisorSupervisor, VisorClient } from "@/lib/data";
import { getSupervisors, addSupervisor, updateSupervisor, deleteSupervisor, getClientsBySupervisor, addClient, deleteClient } from "@/services/visor-app-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Users, User, ArrowRight, Edit, Trash2, KeyRound } from "lucide-react";
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
} from "@/components/ui/alert-dialog"

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
    <div className="space-y-6">
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

       {supervisors.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {supervisors.map((supervisor) => (
            <Card key={supervisor.id} className="flex flex-col">
              <CardHeader>
                 <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg w-fit">
                            <User className="h-6 w-6 text-primary"/>
                        </div>
                        <div>
                            <CardTitle>{supervisor.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2 pt-1"><KeyRound className="h-4 w-4" /> <span className="font-mono">{supervisor.accessCode}</span></CardDescription>
                        </div>
                    </div>
                     <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingSupervisor(supervisor); setIsFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setSupervisorToDelete(supervisor)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                </div>
              </CardHeader>
              <CardFooter className="mt-auto">
                <Button asChild className="w-full">
                  <Link href={`/tools/visor-app/supervisor/${supervisor.id}`}>
                    Ver Clientes <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium">No hay supervisores</h3>
            <p className="mt-1 text-sm">Comienza agregando el primer supervisor.</p>
          </CardContent>
        </Card>
      )}

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

    </div>
  );
}
