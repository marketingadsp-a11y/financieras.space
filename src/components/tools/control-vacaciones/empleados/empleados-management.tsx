"use client";

import * as React from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { EmpleadosTable } from "./empleados-table";
import { EmpleadoForm, type EmpleadoFormValues } from "./empleado-form";
import { getEmpleados, addEmpleado, updateEmpleado, deleteEmpleado } from "@/services/vacaciones-service";
import type { EmpleadoVacaciones } from "@/lib/data";

export function EmpleadosManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [empleados, setEmpleados] = React.useState<EmpleadoVacaciones[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingEmpleado, setEditingEmpleado] = React.useState<EmpleadoVacaciones | null>(null);

  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getEmpleados(user.prefix);
      setEmpleados(data);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los empleados." });
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFormSubmit = async (formData: EmpleadoFormValues) => {
    if (!user?.prefix) return;

    try {
      if (editingEmpleado) {
        await updateEmpleado(editingEmpleado.id, { ...formData });
        toast({ title: "Éxito", description: "Empleado actualizado." });
      } else {
        await addEmpleado({ ...formData, prefix: user.prefix });
        toast({ title: "Éxito", description: "Empleado registrado." });
      }
      setIsFormOpen(false);
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el empleado." });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEmpleado(id);
      toast({ title: "Éxito", description: "Empleado eliminado." });
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el empleado." });
    }
  };
  
  const handleEdit = (empleado: EmpleadoVacaciones) => {
    setEditingEmpleado(empleado);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingEmpleado(null);
    setIsFormOpen(true);
  }

  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingEmpleado(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Empleados</CardTitle>
            <CardDescription>Crea, edita y elimina los empleados para el control de vacaciones.</CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
               <Button size="sm" onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Registrar Empleado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEmpleado ? 'Editar' : 'Registrar'} Empleado</DialogTitle>
              </DialogHeader>
              <EmpleadoForm
                onSubmit={handleFormSubmit}
                empleado={editingEmpleado}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            <span>Cargando empleados...</span>
          </div>
        ) : (
          <EmpleadosTable data={empleados} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </CardContent>
    </Card>
  );
}
