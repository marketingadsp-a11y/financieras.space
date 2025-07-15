
"use client";

import * as React from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminTable } from "@/components/admin/admin-table";
import { AdminForm } from "@/components/admin/admin-form";
import type { Admin, CompanyProfile } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getAdmins, addAdmin, updateAdmin, deleteAdmin, getAdminsByPrefix } from "@/services/admin-service";
import { getAllCompanyProfiles } from "@/services/company-profile-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

export function AdminDashboard() {
  const { user } = useAuth();
  const [admins, setAdmins] = React.useState<Admin[]>([]);
  const [profiles, setProfiles] = React.useState<CompanyProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAdmin, setEditingAdmin] = React.useState<Admin | null>(null);
  const { toast } = useToast();

  const fetchData = React.useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      let adminsFromDb: Admin[];
      if (user.isSuperAdmin) {
        const [adminsData, profilesData] = await Promise.all([
          getAdmins(),
          getAllCompanyProfiles()
        ]);
        adminsFromDb = adminsData;
        setProfiles(profilesData);
      } else {
        adminsFromDb = await getAdminsByPrefix(user.prefix!);
        setProfiles([]);
      }
      setAdmins(adminsFromDb);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddAdmin = async (newAdmin: Omit<Admin, 'id'>) => {
    try {
      const addedAdmin = await addAdmin(newAdmin);
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

  const handleUpdateAdmin = async (updatedAdmin: Admin) => {
    try {
      const { id, ...dataToUpdate } = updatedAdmin;
      await updateAdmin(id, dataToUpdate);
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
      await deleteAdmin(adminId);
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
  
  const handleEditClick = (admin: Admin) => {
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
            <CardTitle>Gestión de Administradores</CardTitle>
            <CardDescription>
              Crea, edita y elimina administradores de la plataforma.
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
              <AdminForm
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
          <AdminTable data={admins} profiles={profiles} onEdit={handleEditClick} onDelete={handleDeleteAdmin} />
        )}
      </CardContent>
    </Card>
  );
}
