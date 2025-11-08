

"use client";

import * as React from "react";
import { PlusCircle, Loader2, Users2, Landmark, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UsersTable } from "@/components/users/users-table";
import { UserForm } from "@/components/users/user-form";
import type { PlazaUser, Plaza, Tool, Admin, OficinaRegistro } from "@/lib/data";
import { getCustomizedTools } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getPlazaUsersByPrefix, addPlazaUser, updatePlazaUser, deletePlazaUser } from "@/services/plaza-user-service";
import { getPlazas } from "@/services/plaza-service";
import { getOficinas as getOficinasRegistro } from "@/services/registro-oficina-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminDashboard } from "../admin/admin-dashboard";


export function UsersManagement() {
  const { user } = useAuth();
  const [plazaUsers, setPlazaUsers] = React.useState<PlazaUser[]>([]);
  const [plazas, setPlazas] = React.useState<Plaza[]>([]);
  const [oficinasRegistro, setOficinasRegistro] = React.useState<OficinaRegistro[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isPlazaUserFormOpen, setIsPlazaUserFormOpen] = React.useState(false);
  const [editingPlazaUser, setEditingPlazaUser] = React.useState<PlazaUser | null>(null);

  const { toast } = useToast();
  const [customTools, setCustomTools] = React.useState(getCustomizedTools());

  React.useEffect(() => {
    const updateTools = () => setCustomTools(getCustomizedTools());
    window.addEventListener('storage', updateTools);
    updateTools(); // Initial call
    return () => window.removeEventListener('storage', updateTools);
  }, []);

  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [
        plazaUsersFromDb, 
        plazasFromDb, 
        oficinasRegistroFromDb
      ] = await Promise.all([
        getPlazaUsersByPrefix(user.prefix),
        getPlazas({ prefix: user.prefix }),
        getOficinasRegistro(user.prefix)
      ]);
      setPlazaUsers(plazaUsersFromDb);
      setPlazas(plazasFromDb);
      setOficinasRegistro(oficinasRegistroFromDb);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos de los usuarios.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user?.prefix]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

   // --- Plaza User Handlers ---
  const handlePlazaUserSubmit = async (userData: Omit<PlazaUser, 'id' | 'prefix'>) => {
    if (!user?.prefix) return;
    try {
      const dataToSave = { ...userData, prefix: user.prefix };
      if (editingPlazaUser) {
        await updatePlazaUser(editingPlazaUser.id, dataToSave);
        toast({ title: "Éxito", description: "Usuario de herramienta actualizado." });
      } else {
        await addPlazaUser(dataToSave);
        toast({ title: "Éxito", description: "Usuario de herramienta agregado." });
      }
      setIsPlazaUserFormOpen(false);
      setEditingPlazaUser(null);
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el usuario." });
    }
  };

  const handleDeletePlazaUser = async (userId: string) => {
     try {
      await deletePlazaUser(userId);
      fetchData();
      toast({ title: "Éxito", description: "Usuario eliminado." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el usuario." });
    }
  };
  
  const handleEditPlazaUserClick = (userToEdit: PlazaUser) => {
      setEditingPlazaUser(userToEdit);
      setIsPlazaUserFormOpen(true);
  }

  // Admins can only assign tools they themselves have access to. SuperAdmins can assign any.
  const adminTools = user?.isSuperAdmin ? customTools : customTools.filter(tool => user?.accessibleTools?.includes(tool.id));
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Usuarios</CardTitle>
            <CardDescription>
              Administra los diferentes tipos de usuarios para las herramientas.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="plaza-users">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="plaza-users">
                    <Users2 className="mr-2"/>
                    Usuarios de Herramientas
                </TabsTrigger>
                <TabsTrigger value="admins">
                    <Shield className="mr-2"/>
                    Administradores
                </TabsTrigger>
            </TabsList>
            
            <TabsContent value="plaza-users" className="mt-6">
                 <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl">Usuarios de Herramientas</CardTitle>
                                <CardDescription>Gestiona usuarios con acceso granular a las herramientas.</CardDescription>
                            </div>
                            <Dialog open={isPlazaUserFormOpen} onOpenChange={(open) => { setIsPlazaUserFormOpen(open); if(!open) setEditingPlazaUser(null); }}>
                                <DialogTrigger asChild>
                                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Agregar Usuario</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-3xl">
                                    <DialogHeader>
                                        <DialogTitle>{editingPlazaUser ? 'Editar' : 'Agregar'} Usuario de Herramienta</DialogTitle>
                                        <CardDescription>El usuario se creará con el prefijo: <span className="font-bold">{user?.prefix}</span></CardDescription>
                                    </DialogHeader>
                                    <UserForm 
                                      onSubmit={handlePlazaUserSubmit} 
                                      user={editingPlazaUser} 
                                      allPlazas={plazas} 
                                      allOficinas={oficinasRegistro}
                                      prefix={user?.prefix} 
                                      adminTools={adminTools}
                                    />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center items-center h-40"><Loader2 className="mr-2 h-8 w-8 animate-spin" /><span>Cargando usuarios...</span></div>
                        ) : (
                            <UsersTable data={plazaUsers} onEdit={handleEditPlazaUserClick} onDelete={handleDeletePlazaUser} />
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="admins" className="mt-6">
                <AdminDashboard />
            </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}
