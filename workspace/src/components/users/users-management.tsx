
"use client";

import * as React from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UsersTable } from "@/components/users/users-table";
import { UserForm } from "@/components/users/user-form";
import type { PlazaUser, Plaza } from "@/lib/data";
import { getCustomizedTools } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getPlazaUsersByPrefix, addPlazaUser, updatePlazaUser, deletePlazaUser } from "@/services/plaza-user-service";
import { getPlazas } from "@/services/plaza-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

export function UsersManagement() {
  const { user } = useAuth();
  const [users, setUsers] = React.useState<PlazaUser[]>([]);
  const [plazas, setPlazas] = React.useState<Plaza[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<PlazaUser | null>(null);
  const { toast } = useToast();
  const allTools = getCustomizedTools();

  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const shouldFetchAllPlazas = user.isSuperAdmin;
      const [usersFromDb, plazasFromDb] = await Promise.all([
        getPlazaUsersByPrefix(user.prefix),
        getPlazas({ prefix: user.prefix, fetchAll: shouldFetchAllPlazas }),
      ]);
      setUsers(usersFromDb);
      setPlazas(plazasFromDb);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user?.prefix, user?.isSuperAdmin]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (userData: Omit<PlazaUser, 'id'>) => {
    if (!user?.prefix) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo determinar el prefijo." });
      return;
    }
    try {
      const dataToSave = { ...userData, prefix: user.prefix };
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
  
  // Admins can only assign tools they themselves have access to. SuperAdmins can assign any.
  const adminTools = user?.isSuperAdmin ? allTools : allTools.filter(tool => user?.accessibleTools?.includes(tool.id));

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Usuarios</CardTitle>
            <CardDescription>
              Crea, edita y elimina usuarios con acceso a plazas y permisos específicos. Todos los usuarios creados aquí usarán el prefijo: <span className="font-bold">{user?.prefix}</span>
            </CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!user?.prefix}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Editar' : 'Agregar'} Usuario</DialogTitle>
                 <CardDescription>
                  El usuario se creará con el prefijo: <span className="font-bold">{user?.prefix}</span>
                </CardDescription>
              </DialogHeader>
              <UserForm
                onSubmit={handleSubmit}
                user={editingUser}
                allPlazas={plazas}
                prefix={user?.prefix}
                adminTools={adminTools}
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
          <UsersTable data={users} onEdit={handleEditClick} onDelete={handleDeleteUser} />
        )}
      </CardContent>
    </Card>
  );
}

    
