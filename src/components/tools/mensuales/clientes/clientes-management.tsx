
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { ClienteMensual, OficinaMensual } from "@/lib/data";
import { getClientes, getOficinas } from "@/services/mensuales-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";
import { ClientesListTable } from "./clientes-list-table";
import { Input } from "@/components/ui/input";

export function ClientesManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientes, setClientes] = React.useState<ClienteMensual[]>([]);
  const [oficinas, setOficinas] = React.useState<OficinaMensual[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");

  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [clientesData, oficinasData] = await Promise.all([
        getClientes(user.prefix),
        getOficinas(user.prefix),
      ]);
      setClientes(clientesData);
      setOficinas(oficinasData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const filteredClientes = React.useMemo(() => {
    return clientes.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.displayId?.toString().includes(searchTerm)
    );
  }, [clientes, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listado de Clientes</CardTitle>
        <CardDescription>
          Busca y visualiza todos los clientes registrados en la herramienta de préstamos mensuales.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center pb-4">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Buscar por nombre o ID de cliente..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
                />
            </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            <span>Cargando clientes...</span>
          </div>
        ) : (
          <ClientesListTable data={filteredClientes} oficinas={oficinas} />
        )}
      </CardContent>
    </Card>
  );
}
