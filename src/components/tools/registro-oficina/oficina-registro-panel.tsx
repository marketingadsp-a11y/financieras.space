
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { OficinaRegistro } from "@/lib/data";
import { getOficinaById } from "@/services/registro-oficina-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  format,
  eachWeekOfInterval,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";

function getWeeksForMonth(month: Date) {
  const firstDay = startOfMonth(month);
  const lastDay = endOfMonth(month);

  const weeks = eachWeekOfInterval(
    {
      start: firstDay,
      end: lastDay,
    },
    { weekStartsOn: 6 } // 6 for Saturday
  );

  return weeks.map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 6 });
    return { start: weekStart, end: weekEnd };
  });
}

export function OficinaRegistroPanel({ oficinaId }: { oficinaId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [oficina, setOficina] = React.useState<OficinaRegistro | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const oficinaData = await getOficinaById(oficinaId);
      setOficina(oficinaData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la información de la oficina.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [oficinaId, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const weeks = getWeeksForMonth(currentMonth);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando datos de la oficina...</span>
      </div>
    );
  }

  if (!oficina) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Oficina no encontrada</CardTitle>
          <CardDescription>
            La oficina que buscas no existe o fue eliminada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/tools/registro-oficina">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Registro para: {oficina.name}
          </h1>
          <p className="text-muted-foreground">
            Ingresa los datos semanales para los conceptos de la oficina.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold capitalize w-48 text-center">
                {format(currentMonth, "LLLL yyyy", { locale: es })}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      </div>

       <div className="space-y-8">
        {weeks.map((week, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Semana {index + 1}
              </CardTitle>
              <CardDescription>
                Del {format(week.start, "dd 'de' LLLL", { locale: es })} al {format(week.end, "dd 'de' LLLL", { locale: es })}
              </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-sm">Formulario de registro semanal en construcción...</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
