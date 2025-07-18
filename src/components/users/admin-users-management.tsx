
"use client";

import * as React from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UsersTable } from "@/components/users/users-table";
import { UserForm } from "@/components/users/user-form";
import type { PlazaUser, Plaza, Tool, Admin } from "@/lib/data";
import { getCustomizedTools } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getAllPlazaUsers, addPlazaUser, updatePlazaUser, deletePlazaUser } from "@/services/plaza-user-service";
import { getAdmins } from "@/services/admin-service";
import { getPlazas } from "@/services/plaza-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

export function AdminUsersManagement({ customTools }: { customTools: Tool[] }) {
  const { user } = useAuth();
  const [users, setUsers] = React.useState<PlazaUser[]>([]);
  const [plazas, setPlazas] = React.useState<Plaza[]>([]);
  const [admins, setAdmins] = React.useState<Admin[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<PlazaUser | null>(null);
  const { toast } = useToast();
  const allTools = getCustomizedTools();

  const fetchData = React.useCallback(async () => {
    if (!user?.isSuperAdmin) return;
    setIsLoading(true);
    try {
      const [usersFromDb, plazasFromDb, adminsFromDb] = await Promise.all([
        getAllPlazaUsers(),
        getPlazas({ fetchAll: true }),
        getAdmins(),
      ]);
      setUsers(usersFromDb);
      setPlazas(plazasFromDb);
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
  }, [toast, user?.isSuperAdmin]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (userData: Omit<PlazaUser, 'id'>) => {
    try {
      const dataToSave = { ...userData };
      if (editingUser) {
        await updatePlazaUser(editingUser.id, dataToSave);
        toast({ title: "Éxito", description: "Usuario actualizado." });
      } else {
        await addPlazaUser(dataToSave);
        toast({ title: "Éxito", description: "Usuario agregado." });
      }
      setIsFormOpen(false);
      setEditingUser(null);
      fetchData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el usuario.",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
     try {
      await deletePlazaUser(userId);
      fetchData();
      toast({ title: "Éxito", description: "Usuario eliminado." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el usuario." });
    }
  };
  
  const handleEditClick = (userToEdit: PlazaUser) => {
      setEditingUser(userToEdit);
      setIsFormOpen(true);
  }

  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingUser(null);
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Usuarios de Admins</CardTitle>
            <CardDescription>
              Crea, edita y elimina usuarios creados por cualquier administrador.
            </CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Editar' : 'Agregar'} Usuario</DialogTitle>
                 <CardDescription>
                  Crea un nuevo usuario de plaza para cualquier empresa (prefijo).
                </CardDescription>
              </DialogHeader>
              <UserForm
                onSubmit={handleSubmit}
                user={editingUser}
                allPlazas={plazas}
                admins={admins}
                adminTools={allTools}
                isSuperAdminView={true}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            <span>Cargando usuarios...</span>
          </div>
        ) : (
          <UsersTable data={users} onEdit={handleEditClick} onDelete={handleDeleteUser} isSuperAdminView={true} />
        )}
      </CardContent>
    </Card>
  );
}
