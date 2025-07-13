"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getAdmins, updateAdmin } from "@/services/admin-service";
import type { Admin, Tool } from "@/lib/data";
import { allTools } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wrench } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";


export function ToolsManagement() {
  const { user } = useAuth();

  if (user && !user.isSuperAdmin) {
    return <AdminToolsView />;
  }

  return <SuperAdminToolsView />;
}

function SuperAdminToolsView() {
  const [admins, setAdmins] = React.useState<Admin[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedTool, setSelectedTool] = React.useState<Tool | null>(null);
  const [selectedAdmins, setSelectedAdmins] = React.useState<Set<string>>(new Set());
  const { toast } = useToast();

  React.useEffect(() => {
    async function loadAdmins() {
      try {
        const adminData = await getAdmins();
        setAdmins(adminData);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los administradores.",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadAdmins();
  }, [toast]);

  const handleManageAccessClick = (tool: Tool) => {
    setSelectedTool(tool);
    const adminsWithAccess = new Set(
      admins
        .filter((admin) => admin.accessibleTools?.includes(tool.id))
        .map((admin) => admin.id)
    );
    setSelectedAdmins(adminsWithAccess);
    setIsModalOpen(true);
  };

  const handleAdminSelection = (adminId: string) => {
    setSelectedAdmins((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(adminId)) {
        newSet.delete(adminId);
      } else {
        newSet.add(adminId);
      }
      return newSet;
    });
  };

  const handleSaveChanges = async () => {
    if (!selectedTool) return;

    try {
      const updates = admins.map(admin => {
        const hasAccess = selectedAdmins.has(admin.id);
        const hadAccess = admin.accessibleTools?.includes(selectedTool.id);
        let newTools = admin.accessibleTools ? [...admin.accessibleTools] : [];

        if (hasAccess && !hadAccess) {
            newTools.push(selectedTool.id);
        } else if (!hasAccess && hadAccess) {
            newTools = newTools.filter(t => t !== selectedTool.id);
        } else {
            return null; // No changes for this admin
        }
        
        return updateAdmin(admin.id, { accessibleTools: newTools });
      });
      
      await Promise.all(updates.filter(Boolean));

      // Refetch admins to update state
      const updatedAdmins = await getAdmins();
      setAdmins(updatedAdmins);

      toast({
        title: "Éxito",
        description: "Permisos actualizados correctamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar los cambios.",
      });
    } finally {
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Gestión de Herramientas</CardTitle>
          <CardDescription>
            Asigna acceso a las herramientas disponibles para los administradores de la plataforma.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {allTools.map((tool) => (
          <Card key={tool.id}>
            <CardHeader>
                <div className="flex items-start gap-4">
                    <Wrench className="h-8 w-8 text-muted-foreground mt-1" />
                    <div className="flex-1">
                        <CardTitle>{tool.name}</CardTitle>
                        <CardDescription>{tool.description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => handleManageAccessClick(tool)} className="w-full">
                Gestionar Acceso
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gestionar Acceso para {selectedTool?.name}</DialogTitle>
            <DialogDescription>
              Selecciona los administradores que tendrán acceso a esta herramienta.
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
             </div>
          ) : (
             <div className="space-y-4 py-4">
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`admin-${admin.id}`}
                    checked={selectedAdmins.has(admin.id)}
                    onCheckedChange={() => handleAdminSelection(admin.id)}
                  />
                  <Label htmlFor={`admin-${admin.id}`} className="flex-1 cursor-pointer">
                    <span className="font-medium">{admin.name}</span>
                    <p className="text-sm text-muted-foreground">{admin.username}</p>
                  </Label>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveChanges}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminToolsView() {
    const { user } = useAuth();

    const accessibleUserTools = allTools.filter(tool => user?.accessibleTools?.includes(tool.id));
    
    return (
         <div className="space-y-6">
             <Card>
                <CardHeader>
                <CardTitle>Herramientas Disponibles</CardTitle>
                <CardDescription>
                    Aquí encontrarás las herramientas a las que tienes acceso.
                </CardDescription>
                </CardHeader>
            </Card>

            {accessibleUserTools.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {accessibleUserTools.map((tool) => (
                    <Card key={tool.id}>
                         <CardHeader>
                            <div className="flex items-start gap-4">
                                <Wrench className="h-8 w-8 text-muted-foreground mt-1" />
                                <div className="flex-1">
                                    <CardTitle>{tool.name}</CardTitle>
                                    <CardDescription>{tool.description}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardFooter>
                            <Button asChild className="w-full">
                               <Link href={tool.href}>Abrir Herramienta</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">No tienes herramientas asignadas. Contacta a un super administrador.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
