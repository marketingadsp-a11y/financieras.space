"use client";

import * as React from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuperAdminTable } from "@/components/settings/super-admin-table";
import { SuperAdminForm } from "@/components/settings/super-admin-form";
import type { SuperAdmin } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getSuperAdmins, addSuperAdmin, updateSuperAdmin, deleteSuperAdmin } from "@/services/super-admin-service";
import { useToast } from "@/hooks/use-toast";

export function SuperAdminDashboard() {
  const [superAdmins, setSuperAdmins] = React.useState<SuperAdmin[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingSuperAdmin, setEditingSuperAdmin] = React.useState<SuperAdmin | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    fetchSuperAdmins();
  }, []);

  const fetchSuperAdmins = async () => {
    try {
      setIsLoading(true);
      const superAdminsFromDb = await getSuperAdmins();
      setSuperAdmins(superAdminsFromDb);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los super administradores.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuperAdmin = async (newSuperAdmin: Omit<SuperAdmin, 'id'>) => {
    try {
      const addedSuperAdmin = await addSuperAdmin(newSuperAdmin);
      setSuperAdmins(prev => [...prev, addedSuperAdmin]);
      setIsFormOpen(false);
       toast({
        title: "Éxito",
        description: "Super administrador agregado correctamente.",
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo agregar el super administrador.",
      });
    }
  };

  const handleUpdateSuperAdmin = async (updatedSuperAdmin: SuperAdmin) => {
    try {
      const { id, ...dataToUpdate } = updatedSuperAdmin;
      await updateSuperAdmin(id, dataToUpdate);
      setSuperAdmins(prev => prev.map(admin => admin.id === updatedSuperAdmin.id ? updatedSuperAdmin : admin));
      setEditingSuperAdmin(null);
      setIsFormOpen(false);
      toast({
        title: "Éxito",
        description: "Super administrador actualizado correctamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el super administrador.",
      });
    }
  };

  const handleDeleteSuperAdmin = async (superAdminId: string) => {
     try {
      await deleteSuperAdmin(superAdminId);
      setSuperAdmins(prev => prev.filter(admin => admin.id !== superAdminId));
      toast({
        title: "Éxito",
        description: "Super administrador eliminado correctamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el super administrador.",
      });
    }
  };
  
  const handleEditClick = (superAdmin: SuperAdmin) => {
      setEditingSuperAdmin(superAdmin);
      setIsFormOpen(true);
  }

  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingSuperAdmin(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Super Administradores</CardTitle>
            <CardDescription>
              Crea, edita y elimina super administradores de la plataforma.
            </CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Super Administrador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSuperAdmin ? 'Editar' : 'Agregar'} Super Administrador</DialogTitle>
              </DialogHeader>
              <SuperAdminForm
                onSubmit={editingSuperAdmin ? handleUpdateSuperAdmin : handleAddSuperAdmin}
                superAdmin={editingSuperAdmin}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            <span>Cargando super administradores...</span>
          </div>
        ) : (
          <SuperAdminTable data={superAdmins} onEdit={handleEditClick} onDelete={handleDeleteSuperAdmin} />
        )}
      </CardContent>
    </Card>
  );
}
