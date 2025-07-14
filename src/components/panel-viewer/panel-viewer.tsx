
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { getAdmins } from "@/services/admin-service";
import type { Admin } from "@/lib/data";
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, Search, Building } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const AdminCard = ({ admin, onImpersonate, isImpersonating }: { admin: Admin, onImpersonate: (admin: Admin) => void, isImpersonating: boolean }) => {
    const [isProcessing, setIsProcessing] = React.useState(false);

    const handleImpersonateClick = async () => {
        setIsProcessing(true);
        await onImpersonate(admin);
    };

    return (
        <Card className="group flex flex-col text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary">
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
  const [admins, setAdmins] = React.useState<Admin[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isImpersonating, setIsImpersonating] = React.useState(false);

  React.useEffect(() => {
    if (user?.isSuperAdmin) {
      getAdmins()
        .then((data) => {
          setAdmins(data);
        })
        .catch(() => {
          // Handle error
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [user]);

  const handleImpersonate = async (adminToImpersonate: Admin) => {
    setIsImpersonating(true);
    try {
        await impersonateUser(adminToImpersonate.id, 'Admin');
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
            <h1 className="text-3xl font-bold tracking-tight">Visualizador de Paneles</h1>
            <p className="text-muted-foreground">
            Selecciona un administrador para ingresar a su panel y gestionar sus herramientas.
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
                    {filteredAdmins.sort((a,b) => a.name.localeCompare(b.name)).map((admin) => (
                        <AdminCard 
                            key={admin.id} 
                            admin={admin}
                            onImpersonate={handleImpersonate}
                            isImpersonating={isImpersonating}
                        />
                    ))}
                 </div>
            </TabsContent>

            {companyPrefixes.map(prefix => (
                <TabsContent key={prefix} value={prefix} className="pt-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                         {(groupedAdmins[prefix] || []).sort((a,b) => a.name.localeCompare(b.name)).map((admin) => (
                            <AdminCard 
                                key={admin.id} 
                                admin={admin}
                                onImpersonate={handleImpersonate}
                                isImpersonating={isImpersonating}
                            />
                        ))}
                    </div>
                </TabsContent>
            ))}
        </Tabs>
      ) : (
        <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
                <p>No se encontraron administradores.</p>
                <p className="text-sm">{searchTerm ? "Intenta con otro término de búsqueda." : "Crea un nuevo administrador para empezar."}</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
