
"use client";

import * as React from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UsersTable } from "@/components/tools/overdue-portfolio/users/users-table";
import { UserForm } from "@/components/tools/overdue-portfolio/users/user-form";
import type { PlazaUser, Plaza } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getPlazaUsers, addPlazaUser, updatePlazaUser, deletePlazaUser } from "@/services/plaza-user-service";
import { getPlazas } from "@/services/plaza-service";
import { useToast } from "@/hooks/use-toast";

export function UsersManagement() {
  const [users, setUsers] = React.useState<PlazaUser[]>([]);
  const [plazas, setPlazas] = React.useState<Plaza[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<PlazaUser | null>(null);
  const { toast } = useToast();

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const [usersFromDb, plazasFromDb] = await Promise.all([
        getPlazaUsers(),
        getPlazas(),
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
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (userData: Omit<PlazaUser, 'id'>) => {
    try {
      if (editingUser) {
        await updatePlazaUser(editingUser.id, userData);
        toast({ title: "Éxito", description: "Usuario actualizado." });
      } else {
        await addPlazaUser(userData);
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
  
  const handleEditClick = (user: PlazaUser) => {
      setEditingUser(user);
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
            <CardTitle>Gestión de Usuarios de Plaza</CardTitle>
            <CardDescription>
              Crea, edita y elimina usuarios con acceso a plazas específicas.
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
              </DialogHeader>
              <UserForm
                onSubmit={handleSubmit}
                user={editingUser}
                allPlazas={plazas}
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
