
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { getAdmins, getAdminById } from "@/services/admin-service";
import type { Admin } from "@/lib/data";
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, Search, Building } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { getCustomizedTools } from "@/lib/data";

const AdminCard = ({ admin, onImpersonate, isImpersonating, linkedAdminData }: { admin: Admin, onImpersonate: (admin: Admin, allowedTools?: string[]) => void, isImpersonating: boolean, linkedAdminData?: { allowedTools: string[] } }) => {
    const [isProcessing, setIsProcessing] = React.useState(false);
    const customTools = getCustomizedTools();

    const handleImpersonateClick = async () => {
        setIsProcessing(true);
        await onImpersonate(admin, linkedAdminData?.allowedTools);
        // Processing will stop on navigation or error
    };
    
    const allowedToolNames = React.useMemo(() => {
        if (!linkedAdminData) return null;
        return linkedAdminData.allowedTools.map(toolId => {
            return customTools.find(t => t.id === toolId)?.name || toolId;
        })
    }, [linkedAdminData, customTools]);

    return (
        <Card className="group flex flex-col text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-4 border-transparent hover:border-primary">
            <CardHeader className="pt-6">
                 <Avatar className="h-24 w-24 mb-4 mx-auto border-4 border-muted transition-colors duration-300 group-hover:border-primary/20">
                    <AvatarFallback className="text-4xl bg-muted/50">
                        {admin.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
            </CardHeader>
            <CardContent className="flex-grow">
                <CardTitle className="text-lg">{admin.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{admin.prefix}.{admin.username}</p>
                 {allowedToolNames && (
                    <div className="mt-2 text-xs">
                        <p className="font-semibold">Acceso a:</p>
                        <div className="flex flex-wrap gap-1 justify-center mt-1">
                            {allowedToolNames.map(name => <Badge key={name} variant="secondary">{name}</Badge>)}
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="p-4">
                 <Button 
                    className="w-full" 
                    onClick={handleImpersonateClick}
                    disabled={isImpersonating || isProcessing}
                >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <LogIn />}
                    {isProcessing ? "Ingresando..." : "Ingresar al Panel"}
                </Button>
            </CardFooter>
        </Card>
    );
};


export function PanelViewer() {
  const { user, impersonateUser } = useAuth();
  const { toast } = useToast();
  const [admins, setAdmins] = React.useState<Admin[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isImpersonating, setIsImpersonating] = React.useState(false);

  React.useEffect(() => {
    const fetchAdmins = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            if (user.isSuperAdmin) {
                const data = await getAdmins();
                setAdmins(data.filter(a => a.id !== user.id)); // SuperAdmins see all except themselves
            } else if (user.linkedAdmins && user.linkedAdmins.length > 0) {
                const linkedAdminPromises = user.linkedAdmins.map(linked => getAdminById(linked.adminId));
                const linkedAdminsDetails = await Promise.all(linkedAdminPromises);
                setAdmins(linkedAdminsDetails.filter((a): a is Admin => a !== null));
            } else {
                setAdmins([]);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los paneles de administrador.' });
        } finally {
            setIsLoading(false);
        }
    }
    fetchAdmins();
  }, [user, toast]);

  const handleImpersonate = async (adminToImpersonate: Admin, allowedTools?: string[]) => {
    setIsImpersonating(true);
    try {
        await impersonateUser(adminToImpersonate.id, 'Admin', allowedTools);
    } catch (e) {
        setIsImpersonating(false);
    }
  };

  const filteredAdmins = React.useMemo(() => {
    return admins.filter(admin => 
        admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.prefix.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [admins, searchTerm]);

  const groupedAdmins = React.useMemo(() => {
    return filteredAdmins.reduce((acc, admin) => {
      const prefix = admin.prefix || 'Sin Empresa';
      if (!acc[prefix]) {
        acc[prefix] = [];
      }
      acc[prefix].push(admin);
      return acc;
    }, {} as Record<string, Admin[]>);
  }, [filteredAdmins]);
  
  const companyPrefixes = React.useMemo(() => Object.keys(groupedAdmins).sort((a, b) => a.localeCompare(b)), [groupedAdmins]);
  const allTabs = ['Todos', ...companyPrefixes];

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando administradores...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Cambiar de Panel</h1>
            <p className="text-muted-foreground">
              {user?.isSuperAdmin 
                ? "Selecciona un administrador para ingresar a su panel."
                : "Selecciona uno de los paneles a los que tienes acceso."
              }
            </p>
        </div>
        <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
            placeholder="Buscar por nombre, usuario o empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            />
        </div>
       </div>

      {filteredAdmins.length > 0 ? (
        <Tabs defaultValue="Todos" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 h-auto bg-transparent p-0 gap-2">
                {allTabs.map(prefix => (
                    <TabsTrigger 
                        key={prefix} 
                        value={prefix} 
                        className="h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-card data-[state=inactive]:border data-[state=inactive]:text-muted-foreground"
                    >
                         <Building className="mr-2 h-4 w-4"/>
                         {prefix}
                    </TabsTrigger>
                ))}
            </TabsList>

            <TabsContent value="Todos" className="pt-6">
                 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filteredAdmins.sort((a,b) => a.name.localeCompare(b.name)).map((admin) => {
                        const linkedAdminData = user?.linkedAdmins?.find(la => la.adminId === admin.id);
                        return (
                            <AdminCard 
                                key={admin.id} 
                                admin={admin}
                                onImpersonate={handleImpersonate}
                                isImpersonating={isImpersonating}
                                linkedAdminData={linkedAdminData}
                            />
                        )
                    })}
                 </div>
            </TabsContent>

            {companyPrefixes.map(prefix => (
                <TabsContent key={prefix} value={prefix} className="pt-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                         {(groupedAdmins[prefix] || []).sort((a,b) => a.name.localeCompare(b.name)).map((admin) => {
                            const linkedAdminData = user?.linkedAdmins?.find(la => la.adminId === admin.id);
                            return (
                                <AdminCard 
                                    key={admin.id} 
                                    admin={admin}
                                    onImpersonate={handleImpersonate}
                                    isImpersonating={isImpersonating}
                                    linkedAdminData={linkedAdminData}
                                />
                            )
                        })}
                    </div>
                </TabsContent>
            ))}
        </Tabs>
      ) : (
        <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
                <p>No se encontraron paneles.</p>
                <p className="text-sm">{user?.isSuperAdmin ? "Crea un nuevo administrador para empezar." : "No tienes paneles vinculados. Contacta a tu Super Administrador."}</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
