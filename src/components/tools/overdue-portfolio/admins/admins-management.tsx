"use client";

import * as React from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolAdminTable } from "@/components/tools/overdue-portfolio/admins/admin-table";
import { ToolAdminForm } from "@/components/tools/overdue-portfolio/admins/admin-form";
import type { ToolAdmin } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getToolAdmins, addToolAdmin, updateToolAdmin, deleteToolAdmin } from "@/services/tool-admin-service";
import { useToast } from "@/hooks/use-toast";

export function AdminsManagement() {
  const [admins, setAdmins] = React.useState<ToolAdmin[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAdmin, setEditingAdmin] = React.useState<ToolAdmin | null>(null);
  const { toast } = useToast();
  const toolId = 'cartera-vencida';

  React.useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      const adminsFromDb = await getToolAdmins(toolId);
      setAdmins(adminsFromDb);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los administradores de la herramienta.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAdmin = async (newAdmin: Omit<ToolAdmin, 'id' | 'toolId'>) => {
    try {
      const adminData = { ...newAdmin, toolId };
      const addedAdmin = await addToolAdmin(adminData);
      setAdmins(prev => [...prev, addedAdmin]);
      setIsFormOpen(false);
       toast({
        title: "Éxito",
        description: "Administrador agregado correctamente.",
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo agregar el administrador.",
      });
    }
  };

  const handleUpdateAdmin = async (updatedAdmin: ToolAdmin) => {
    try {
      const { id, ...dataToUpdate } = updatedAdmin;
      await updateToolAdmin(id, dataToUpdate);
      setAdmins(prev => prev.map(admin => admin.id === updatedAdmin.id ? updatedAdmin : admin));
      setEditingAdmin(null);
      setIsFormOpen(false);
      toast({
        title: "Éxito",
        description: "Administrador actualizado correctamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el administrador.",
      });
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
     try {
      await deleteToolAdmin(adminId);
      setAdmins(prev => prev.filter(admin => admin.id !== adminId));
      toast({
        title: "Éxito",
        description: "Administrador eliminado correctamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el administrador.",
      });
    }
  };
  
  const handleEditClick = (admin: ToolAdmin) => {
      setEditingAdmin(admin);
      setIsFormOpen(true);
  }

  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingAdmin(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Administradores de Herramienta</CardTitle>
            <CardDescription>
              Estos administradores solo tienen acceso a la herramienta de Cartera Vencida.
            </CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Administrador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAdmin ? 'Editar' : 'Agregar'} Administrador</DialogTitle>
              </DialogHeader>
              <ToolAdminForm
                onSubmit={editingAdmin ? handleUpdateAdmin : handleAddAdmin}
                admin={editingAdmin}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            <span>Cargando administradores...</span>
          </div>
        ) : (
          <ToolAdminTable data={admins} onEdit={handleEditClick} onDelete={handleDeleteAdmin} />
        )}
      </CardContent>
    </Card>
  );
}
