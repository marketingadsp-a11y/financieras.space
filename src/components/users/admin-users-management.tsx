
"use client";

import * as React from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UsersTable } from "@/components/users/users-table";
import { UserForm } from "@/components/users/user-form";
import { ToolAdminForm } from "@/components/tools/income-expenses/users/user-form";
import type { PlazaUser, Plaza, Tool, Admin, ToolAdmin, Sucursal } from "@/lib/data";
import { getCustomizedTools } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllPlazaUsers, addPlazaUser, updatePlazaUser, deletePlazaUser } from "@/services/plaza-user-service";
import { getAllToolAdminsWithPasswords, addToolAdmin as addToolAdminService, updateToolAdmin as updateToolAdminService, deleteToolAdmin as deleteToolAdminService } from "@/services/tool-admin-service";
import { getAdmins } from "@/services/admin-service";
import { getPlazas } from "@/services/plaza-service";
import { getSucursales as getAllSucursales } from "@/services/income-expenses-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

export function AdminUsersManagement() {
  const { user } = useAuth();
  const [plazaUsers, setPlazaUsers] = React.useState<PlazaUser[]>([]);
  const [toolAdmins, setToolAdmins] = React.useState<ToolAdmin[]>([]);
  const [plazas, setPlazas] = React.useState<Plaza[]>([]);
  const [admins, setAdmins] = React.useState<Admin[]>([]);
  const [sucursales, setSucursales] = React.useState<Sucursal[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // State for Plaza User form
  const [isPlazaUserFormOpen, setIsPlazaUserFormOpen] = React.useState(false);
  const [editingPlazaUser, setEditingPlazaUser] = React.useState<PlazaUser | null>(null);

  // State for Tool Admin form
  const [isToolAdminFormOpen, setIsToolAdminFormOpen] = React.useState(false);
  const [editingToolAdmin, setEditingToolAdmin] = React.useState<ToolAdmin | null>(null);
  const [selectedToolId, setSelectedToolId] = React.useState('income-expenses');


  const { toast } = useToast();
  const allTools = getCustomizedTools();

  const fetchData = React.useCallback(async () => {
    if (!user?.isSuperAdmin) return;
    setIsLoading(true);
    try {
      const [
        plazaUsersFromDb, 
        toolAdminsFromDb, 
        plazasFromDb, 
        adminsFromDb,
        allSucursales
      ] = await Promise.all([
        getAllPlazaUsers(),
        getAllToolAdminsWithPasswords(),
        getPlazas({ fetchAll: true }),
        getAdmins(),
        getAllSucursales(), // Fetches all sucursales from all prefixes
      ]);
      setPlazaUsers(plazaUsersFromDb);
      setToolAdmins(toolAdminsFromDb);
      setPlazas(plazasFromDb);
      setAdmins(adminsFromDb);
      setSucursales(allSucursales);
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

  // --- Plaza User Handlers ---
  const handlePlazaUserSubmit = async (userData: Omit<PlazaUser, 'id'>) => {
    try {
      if (editingPlazaUser) {
        await updatePlazaUser(editingPlazaUser.id, userData);
        toast({ title: "Éxito", description: "Usuario de plaza actualizado." });
      } else {
        await addPlazaUser(userData);
        toast({ title: "Éxito", description: "Usuario de plaza agregado." });
      }
      setIsPlazaUserFormOpen(false);
      setEditingPlazaUser(null);
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el usuario de plaza." });
    }
  };

  const handleDeletePlazaUser = async (userId: string) => {
     try {
      await deletePlazaUser(userId);
      fetchData();
      toast({ title: "Éxito", description: "Usuario de plaza eliminado." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el usuario de plaza." });
    }
  };
  
  const handleEditPlazaUserClick = (userToEdit: PlazaUser) => {
      setEditingPlazaUser(userToEdit);
      setIsPlazaUserFormOpen(true);
  }

  // --- Tool Admin Handlers ---
  const handleToolAdminSubmit = async (adminData: Omit<ToolAdmin, 'id' | 'toolId' | 'prefix'>) => {
      if(!user?.id) return;
      try {
        const dataToSave = { ...adminData, toolId: selectedToolId as any, createdBy: user.id };
        if (editingToolAdmin) {
            await updateToolAdminService(editingToolAdmin.id, dataToSave);
            toast({ title: "Éxito", description: "Usuario de herramienta actualizado." });
        } else {
            await addToolAdminService(dataToSave);
            toast({ title: "Éxito", description: "Usuario de herramienta agregado." });
        }
        setIsToolAdminFormOpen(false);
        setEditingToolAdmin(null);
        fetchData();
      } catch (error) {
          toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el usuario de herramienta." });
      }
  };

  const handleDeleteToolAdmin = async (adminId: string) => {
       try {
        await deleteToolAdminService(adminId);
        fetchData();
        toast({ title: "Éxito", description: "Usuario de herramienta eliminado." });
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el usuario." });
      }
  };

  const handleEditToolAdminClick = (admin: ToolAdmin) => {
      setEditingToolAdmin(admin);
      setIsToolAdminFormOpen(true);
  };


  return (
    <Card>
      <CardHeader>
          <CardTitle>Gestión de Usuarios de Admins</CardTitle>
          <CardDescription>
            Crea, edita y elimina usuarios (de plaza o de herramienta) creados por cualquier administrador.
          </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="plaza-users">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="plaza-users">Usuarios de Plaza</TabsTrigger>
                <TabsTrigger value="tool-admins">Usuarios de Herramientas</TabsTrigger>
            </TabsList>
            <TabsContent value="plaza-users" className="mt-4">
                <div className="flex justify-end mb-4">
                    <Dialog open={isPlazaUserFormOpen} onOpenChange={(open) => { setIsPlazaUserFormOpen(open); if(!open) setEditingPlazaUser(null); }}>
                        <DialogTrigger asChild>
                            <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Agregar Usuario de Plaza</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>{editingPlazaUser ? 'Editar' : 'Agregar'} Usuario de Plaza</DialogTitle>
                                <CardDescription>Crea un nuevo usuario de plaza para cualquier empresa (prefijo).</CardDescription>
                            </DialogHeader>
                            <UserForm onSubmit={handlePlazaUserSubmit} user={editingPlazaUser} allPlazas={plazas} admins={admins} adminTools={allTools} isSuperAdminView={true}/>
                        </DialogContent>
                    </Dialog>
                </div>
                {isLoading ? (
                    <div className="flex justify-center items-center h-40"><Loader2 className="mr-2 h-8 w-8 animate-spin" /><span>Cargando usuarios...</span></div>
                ) : (
                    <UsersTable data={plazaUsers} onEdit={handleEditPlazaUserClick} onDelete={handleDeletePlazaUser} isSuperAdminView={true} />
                )}
            </TabsContent>
            <TabsContent value="tool-admins" className="mt-4">
                 <div className="flex justify-end mb-4">
                    <Dialog open={isToolAdminFormOpen} onOpenChange={(open) => { setIsToolAdminFormOpen(open); if(!open) setEditingToolAdmin(null); }}>
                        <DialogTrigger asChild>
                            <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Agregar Usuario de Herramienta</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                             <DialogHeader>
                                <DialogTitle>{editingToolAdmin ? 'Editar' : 'Agregar'} Usuario de Herramienta</DialogTitle>
                                <CardDescription>Crea un nuevo usuario con acceso a una herramienta específica.</CardDescription>
                            </DialogHeader>
                            <ToolAdminForm onSubmit={handleToolAdminSubmit} admin={editingToolAdmin} sucursales={sucursales} admins={admins}/>
                        </DialogContent>
                    </Dialog>
                 </div>
                {isLoading ? (
                    <div className="flex justify-center items-center h-40"><Loader2 className="mr-2 h-8 w-8 animate-spin" /><span>Cargando usuarios...</span></div>
                ) : (
                    <UsersTable data={toolAdmins} onEdit={handleEditToolAdminClick} onDelete={handleDeleteToolAdmin} isSuperAdminView={true} />
                )}
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
