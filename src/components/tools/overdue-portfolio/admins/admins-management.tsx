
"use client";

import * as React from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolAdminTable } from "@/components/tools/overdue-portfolio/admins/admin-table";
import { ToolAdminForm } from "@/components/tools/overdue-portfolio/admins/admin-form";
import type { ToolAdmin, Admin } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getToolAdmins, addToolAdmin, updateToolAdmin, deleteToolAdmin } from "@/services/tool-admin-service";
import { getAdminsByPrefix } from "@/services/admin-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

type CombinedAdmin = (
  | (Omit<ToolAdmin, 'toolId'> & { role: 'Admin de Herramienta'; editable: true })
  | (Omit<Admin, 'role' | 'accessibleTools'> & { role: 'Admin Global'; editable: false })
);


export function AdminsManagement() {
  const { user } = useAuth();
  const [admins, setAdmins] = React.useState<CombinedAdmin[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAdmin, setEditingAdmin] = React.useState<ToolAdmin | null>(null);
  const { toast } = useToast();
  const toolId = 'cartera-vencida';

  const fetchAdmins = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const toolAdminsPromise = getToolAdmins(toolId, user.prefix);
      const globalAdminsPromise = getAdminsByPrefix(user.prefix);
      
      const [toolAdmins, globalAdmins] = await Promise.all([toolAdminsPromise, globalAdminsPromise]);

      const combined: CombinedAdmin[] = [];
      
      globalAdmins.forEach(ga => {
          if (ga.accessibleTools?.includes(toolId)) {
              combined.push({ ...ga, role: 'Admin Global', editable: false });
          }
      });
      
      toolAdmins.forEach(ta => {
          combined.push({ ...ta, role: 'Admin de Herramienta', editable: true });
      });
      
      const uniqueAdmins = Array.from(new Map(combined.map(item => [item.id, item])).values());
      
      setAdmins(uniqueAdmins);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los administradores.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user?.prefix]);
  
  React.useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);


  const handleAddAdmin = async (newAdmin: Omit<ToolAdmin, 'id' | 'toolId' | 'prefix'>) => {
    if(!user?.prefix || !user?.id) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo identificar al creador."});
        return;
    }
    try {
      const adminData = { ...newAdmin, toolId, prefix: user.prefix, createdBy: user.id };
      const addedAdmin = await addToolAdmin(adminData);
      setAdmins(prev => [...prev, { ...addedAdmin, role: 'Admin de Herramienta', editable: true }]);
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
      await fetchAdmins(); // Refetch all to update the list correctly
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
  
  const handleEditClick = (admin: CombinedAdmin) => {
      if(admin.editable) {
        setEditingAdmin(admin as ToolAdmin);
        setIsFormOpen(true);
      } else {
         toast({
            variant: "destructive",
            title: "Acción no permitida",
            description: "Los admins globales se gestionan desde el panel principal de administradores.",
        });
      }
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
        <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
          <div>
            <CardTitle>Accesos a Cartera Vencida</CardTitle>
            <CardDescription>
              Lista de todos los usuarios con acceso a esta herramienta bajo el prefijo <span className="font-bold">{user?.prefix}</span>. Solo los "Admin de Herramienta" se pueden gestionar desde aquí.
            </CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Admin de Herramienta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAdmin ? 'Editar' : 'Agregar'} Admin de Herramienta</DialogTitle>
                 <CardDescription>
                  Este administrador solo tendrá acceso a la herramienta de Cartera Vencida y usará el prefijo: <span className="font-bold">{user?.prefix}</span>
                </CardDescription>
              </DialogHeader>
              <ToolAdminForm
                onSubmit={editingAdmin ? handleUpdateAdmin : handleAddAdmin}
                admin={editingAdmin}
                prefix={user?.prefix}
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
