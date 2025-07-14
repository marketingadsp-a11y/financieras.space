"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { getAdmins } from "@/services/admin-service";
import type { Admin } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, Building, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const AdminCard = ({ admin, onImpersonate, isImpersonating }: { admin: Admin, onImpersonate: (admin: Admin) => void, isImpersonating: boolean }) => {
    const [isProcessing, setIsProcessing] = React.useState(false);

    const handleImpersonateClick = async () => {
        setIsProcessing(true);
        await onImpersonate(admin);
    };

    return (
        <Card className="group relative aspect-square flex flex-col items-center justify-center p-6 text-center transition-all duration-300 hover:shadow-lg hover:border-primary/50">
            <Avatar className="h-20 w-20 mb-4 border-2 border-transparent group-hover:border-primary/30 transition-colors duration-300">
                <AvatarFallback className="text-3xl bg-muted group-hover:bg-primary/10 transition-colors duration-300">
                    {admin.name.charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <h3 className="font-bold text-lg">{admin.name}</h3>
            <p className="text-sm text-muted-foreground">{admin.prefix}.{admin.username}</p>
            
            <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                 <Button 
                    className="w-full" 
                    onClick={handleImpersonateClick}
                    disabled={isImpersonating || isProcessing}
                >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <LogIn />}
                    {isProcessing ? "Ingresando..." : "Ingresar al Panel"}
                </Button>
            </div>
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
    // The context will handle the redirect on success
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando administradores...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visualizador de Paneles</h1>
        <p className="text-muted-foreground">
          Selecciona un administrador para ingresar a su panel y gestionar sus herramientas.
        </p>
      </div>

       <div className="sticky top-0 z-10 bg-background/80 py-4 backdrop-blur-md -mx-6 px-6">
        <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
            placeholder="Buscar por nombre, usuario o empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            />
        </div>
       </div>

      {Object.entries(groupedAdmins).sort(([a], [b]) => a.localeCompare(b)).map(([prefix, adminGroup]) => (
        <div key={prefix} className="space-y-4">
            <div className="flex items-center gap-3 border-b pb-2">
                <Building className="h-6 w-6 text-muted-foreground" />
                <h2 className="text-xl font-bold tracking-tight text-primary">{prefix}</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {adminGroup.sort((a,b) => a.name.localeCompare(b.name)).map((admin) => (
                <AdminCard 
                    key={admin.id} 
                    admin={admin}
                    onImpersonate={handleImpersonate}
                    isImpersonating={isImpersonating}
                />
            ))}
            </div>
        </div>
      ))}
       {Object.keys(groupedAdmins).length === 0 && !isLoading && (
        <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
                <p>No se encontraron administradores con el criterio de búsqueda.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
