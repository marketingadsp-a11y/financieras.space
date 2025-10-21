
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getHistoryLogs } from "@/services/history-service";
import type { HistoryLog } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { HistoryTable } from "./history-table";

export function HistoryPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = React.useState<HistoryLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchLogs = async () => {
      if (!user?.prefix) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const logsData = await getHistoryLogs(user.prefix, 'overdue-portfolio');
        setLogs(logsData);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los registros de historial.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [user?.prefix, toast]);

  const paymentLogs = logs.filter(log => log.type === 'payment');
  const actionLogs = logs.filter(log => ['create', 'update', 'delete'].includes(log.type));

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando historial...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Actividad</CardTitle>
        <CardDescription>
          Registro de todos los abonos y acciones realizadas en la herramienta de Cartera Vencida.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="abonos">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="abonos">Abonos</TabsTrigger>
            <TabsTrigger value="acciones">Acciones</TabsTrigger>
          </TabsList>
          <TabsContent value="abonos" className="mt-4">
            <HistoryTable data={paymentLogs} type="payment" />
          </TabsContent>
          <TabsContent value="acciones" className="mt-4">
            <HistoryTable data={actionLogs} type="action" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
