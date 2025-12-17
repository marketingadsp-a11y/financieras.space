"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function CompensationsManagement() {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate loading data
    setTimeout(() => setIsLoading(false), 500);
  }, []);


  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Compensaciones</CardTitle>
        <CardDescription>
          Aquí podrás definir los ejecutivos, su nómina base, y los bonos disponibles con sus porcentajes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-10 text-muted-foreground">
            <p>El panel de gestión de compensaciones se construirá aquí.</p>
        </div>
      </CardContent>
    </Card>
  );
}
