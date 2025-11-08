
"use client";

import * as React from "react";
import { PlusCircle, Loader2, Users2, Landmark, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UsersTable } from "@/components/users/users-table";
import { UserForm } from "@/components/users/user-form";
import { ToolAdminForm } from "@/components/tools/income-expenses/users/user-form";
import type { PlazaUser, Plaza, Tool, ToolAdmin, Sucursal, Admin, OficinaRegistro } from "@/lib/data";
import { getCustomizedTools } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getPlazaUsersByPrefix, addPlazaUser, updatePlazaUser, deletePlazaUser } from "@/services/plaza-user-service";
import { getToolAdmins, addToolAdmin, updateToolAdmin, deleteToolAdmin as deleteToolAdminService } from "@/services/tool-admin-service";
import { getPlazas } from "@/services/plaza-service";
import { getSucursales } from "@/services/income-expenses-service";
import { getOficinas as getOficinasRegistro } from "@/services/registro-oficina-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminDashboard } from "../admin/admin-dashboard";


export function UsersManagement() {
  const { user } = useAuth();
  const [plazaUsers, setPlazaUsers] = React.useState<PlazaUser[]>([]);
  const [toolAdmins, setToolAdmins] = React.useState<ToolAdmin[]>([]);
  const [plazas, setPlazas] = React.useState<Plaza[]>([]);
  const [sucursales, setSucursales] = React.useState<Sucursal[]>([]);
  const [oficinasRegistro, setOficinasRegistro] = React.useState<OficinaRegistro[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // State for Plaza User form
  const [isPlazaUserFormOpen, setIsPlazaUserFormOpen] = React.useState(false);
  const [editingPlazaUser, setEditingPlazaUser] = React.useState<PlazaUser | null>(null);

  // State for Tool Admin form
  const [isToolAdminFormOpen, setIsToolAdminFormOpen] = React.useState(false);
  const [editingToolAdmin, setEditingToolAdmin] = React.useState<ToolAdmin | null>(null);


  const { toast } = useToast();
  const [customTools, setCustomTools] = React.useState(getCustomizedTools());

  React.useEffect(() => {
    // Effect to update tool names if they change in localStorage
    const updateTools = () => setCustomTools(getCustomizedTools());
    window.addEventListener('storage', updateTools);
    updateTools(); // Initial call
    return () => window.removeEventListener('storage', updateTools);
  }, []);

  const plazaUserToolName = customTools.find(t => t.id === 'cartera-vencida')?.name || 'Usuarios de Plaza';
  const toolAdminToolName = customTools.find(t => t.id === 'income-expenses')?.name || 'Usuarios Gastos/Ingresos';

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
        toolAdminsFromDb, 
        sucursalesFromDb,
        oficinasRegistroFromDb
      ] = await Promise.all([
        getPlazaUsersByPrefix(user.prefix),
        getPlazas({ prefix: user.prefix }),
        getToolAdmins('income-expenses', user.prefix),
        getSucursales(user.prefix),
        getOficinasRegistro(user.prefix)
      ]);
      setPlazaUsers(plazaUsersFromDb);
      setPlazas(plazasFromDb);
      setToolAdmins(toolAdminsFromDb);
      setSucursales(sucursalesFromDb);
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
        toast({ title: "Éxito", description: "Usuario de plaza actualizado." });
      } else {
        await addPlazaUser(dataToSave);
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
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el usuario." });
    }
  };
  
  const handleEditPlazaUserClick = (userToEdit: PlazaUser) => {
      setEditingPlazaUser(userToEdit);
      setIsPlazaUserFormOpen(true);
  }

    // --- Tool Admin Handlers ---
  const handleToolAdminSubmit = async (adminData: Omit<ToolAdmin, 'id' | 'toolId' | 'createdBy'>) => {
      if(!user?.id) return;
      try {
        const dataToSave = { ...adminData, toolId: 'income-expenses' as const, createdBy: user.id };
        if (editingToolAdmin) {
            await updateToolAdmin(editingToolAdmin.id, dataToSave);
            toast({ title: "Éxito", description: "Usuario de herramienta actualizado." });
        } else {
            await addToolAdmin(dataToSave);
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
            
            {/* Main User Management Tab (Plaza/Tool) */}
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

            {/* Admins Tab */}
            <TabsContent value="admins" className="mt-6">
                <AdminDashboard />
            </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}
