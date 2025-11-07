
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { OficinaRegistro } from "@/lib/data";
import { getOficinas } from "@/services/registro-oficina-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Building, ArrowRight } from "lucide-react";
import Link from "next/link";

export function RegistroOficinaDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [oficinas, setOficinas] = React.useState<OficinaRegistro[]>([]);
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando oficinas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
            <CardTitle>Dashboard de Registro de Oficina</CardTitle>
            <CardDescription>
            Selecciona una oficina para comenzar a registrar los datos semanales y mensuales.
            </CardDescription>
        </CardHeader>
      </Card>

      {oficinas.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {oficinas.map((oficina) => (
            <Card key={oficina.id} className="group flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg w-fit">
                      <Building className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <div>
                      <CardTitle>{oficina.name}</CardTitle>
                      <CardDescription>ID: {oficina.id.substring(0, 6)}...</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="mt-auto">
                <Button asChild className="w-full">
                  <Link href={`/tools/registro-oficina/oficina/${oficina.id}`}>
                    Gestionar Oficina
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No hay oficinas creadas. Comienza por crear una en "Gestionar Oficinas".
          </CardContent>
        </Card>
      )}
    </div>
  );
}
