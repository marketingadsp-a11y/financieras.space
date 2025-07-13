"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { getAdmins } from "@/services/admin-service";
import type { Admin } from "@/lib/data";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, Building } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

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
    await impersonateUser(adminToImpersonate.id, 'Admin');
    // The context will handle the redirect
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

       <div className="sticky top-0 z-10 bg-background/80 py-4 backdrop-blur-md">
         <Input
          placeholder="Buscar por nombre, usuario o empresa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
       </div>

      {Object.entries(groupedAdmins).sort(([a], [b]) => a.localeCompare(b)).map(([prefix, adminGroup]) => (
        <div key={prefix} className="space-y-4">
            <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-bold tracking-tight text-primary">{prefix}</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {adminGroup.map((admin) => (
                <Card key={admin.id} className="flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                        <AvatarFallback>{admin.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle>{admin.name}</CardTitle>
                        <CardDescription>{admin.prefix}.{admin.username}</CardDescription>
                    </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow" />
                <CardFooter>
                    <Button 
                        className="w-full" 
                        onClick={() => handleImpersonate(admin)}
                        disabled={isImpersonating}
                    >
                    {isImpersonating ? <Loader2 className="animate-spin" /> : <LogIn />}
                    Ingresar al Panel
                    </Button>
                </CardFooter>
                </Card>
            ))}
            </div>
        </div>
      ))}
       {Object.keys(groupedAdmins).length === 0 && !isLoading && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No se encontraron administradores.</p>
        </div>
      )}
    </div>
  );
}
