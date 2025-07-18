
"use client";

import * as React from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UsersTable } from "@/components/users/users-table";
import { UserForm } from "@/components/users/user-form";
import type { PlazaUser, Plaza, Tool, Admin, ToolAdmin, Sucursal } from "@/lib/data";
import { getCustomizedTools } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getPlazaUsersByPrefix, addPlazaUser, updatePlazaUser, deletePlazaUser } from "@/services/plaza-user-service";
import { getToolAdmins, updateToolAdmin, deleteToolAdmin } from "@/services/tool-admin-service";
import { getPlazas } from "@/services/plaza-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

type CombinedUser = PlazaUser | ToolAdmin;

function isPlazaUser(user: any): user is PlazaUser {
    return 'plazaAccess' in user && !('toolId' in user);
}

export function UsersManagement({ customTools }: { customTools: Tool[] }) {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = React.useState<CombinedUser[]>([]);
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
      
      const [
        plazaUsersFromDb, 
        toolAdminsFromDb,
        plazasFromDb
      ] = await Promise.all([
        getPlazaUsersByPrefix(user.prefix),
        getToolAdmins(undefined, user.prefix), // Fetch all tool admins for this prefix
        getPlazas({ prefix: user.prefix, fetchAll: shouldFetchAllPlazas }),
      ]);
      
      const combinedUsers: CombinedUser[] = [...plazaUsersFromDb, ...toolAdminsFromDb];

      setAllUsers(combinedUsers);
      setPlazas(plazasFromDb);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos de los usuarios.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user?.prefix, user?.isSuperAdmin]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (userData: Omit<PlazaUser, 'id' | 'prefix'> & { prefix?: string }) => {
    const finalPrefix = userData.prefix || user?.prefix;
    if (!finalPrefix) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo determinar el prefijo." });
        return;
    }

    try {
      const { prefix, ...dataToSave } = userData;
      const finalData = { ...dataToSave, prefix: finalPrefix };
      
      if (editingUser) {
        await updatePlazaUser(editingUser.id, finalData);
        toast({ title: "Éxito", description: "Usuario actualizado." });
      } else {
        await addPlazaUser(finalData);
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
    const userToDelete = allUsers.find(u => u.id === userId);
    if (!userToDelete) return;

     try {
      if (isPlazaUser(userToDelete)) {
        await deletePlazaUser(userId);
      } else {
        await deleteToolAdmin(userId);
      }
      fetchData();
      toast({ title: "Éxito", description: "Usuario eliminado." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el usuario." });
    }
  };
  
  const handleEditClick = (userToEdit: CombinedUser) => {
      // For now, we only allow editing PlazaUsers from this main form.
      // Tool Admins would require a more complex, tool-specific form.
      if (isPlazaUser(userToEdit)) {
        setEditingUser(userToEdit);
        setIsFormOpen(true);
      } else {
         toast({ variant: "destructive", title: "Acción no permitida", description: "La edición de usuarios de herramienta debe hacerse desde la sección de 'Usuarios de Admins' en el panel del Super Administrador." });
      }
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
              Crea y gestiona usuarios de plaza, y visualiza usuarios de herramientas para tu empresa.
            </CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!user?.prefix}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Usuario de Plaza
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Editar' : 'Agregar'} Usuario de Plaza</DialogTitle>
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
          <UsersTable data={allUsers} onEdit={handleEditClick} onDelete={handleDeleteUser} />
        )}
      </CardContent>
    </Card>
  );
}
