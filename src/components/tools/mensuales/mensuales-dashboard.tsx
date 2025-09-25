
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { OficinaMensual } from "@/lib/data";
import { getOficinas } from "@/services/mensuales-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle } from "lucide-react";
import Link from "next/link";

export function MensualesDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [oficinas, setOficinas] = React.useState<OficinaMensual[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const data = await getOficinas(user.prefix);
      setOficinas(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las oficinas.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Gestión de Préstamos Mensuales</h1>
            </div>
            <div className="flex items-center gap-2">
                <Button asChild>
                  <Link href="/tools/mensuales/oficinas">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear Oficina
                  </Link>
                </Button>
            </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Oficinas</CardTitle>
                <CardDescription>Lista de todas tus oficinas registradas en esta herramienta.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                     <div className="flex justify-center items-center h-40">
                        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                        <span>Cargando oficinas...</span>
                    </div>
                ) : oficinas.length > 0 ? (
                    <div>
                        {/* Placeholder for offices list */}
                        <p>Se encontraron {oficinas.length} oficina(s).</p>
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>No hay oficinas creadas.</p>
                        <p className="text-sm">Empieza por crear tu primera oficina.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
