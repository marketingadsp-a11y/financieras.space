
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Calendar, User, DollarSign, AlertTriangle, Gift } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getPayrollHistory } from "@/services/payroll-service";
import type { PayrollHistory } from "@/lib/data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, getMonth, getYear } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "../ui/separator";

function groupHistoryByMonth(history: PayrollHistory[]) {
  return history.reduce((acc, item) => {
    const monthKey = format(item.date, "yyyy-MM");
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(item);
    return acc;
  }, {} as Record<string, PayrollHistory[]>);
}

export function PayrollHistoryPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = React.useState<PayrollHistory[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!user?.prefix) {
        setIsLoading(false);
        return;
      }
      setError(null);
      try {
        const historyData = await getPayrollHistory(user.prefix);
        setHistory(historyData);
      } catch (error) {
        const errorMessage = "No se pudo cargar el historial de nómina. Por favor, intenta de nuevo más tarde.";
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar el historial de nómina.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user?.prefix, toast]);

  const groupedHistory = React.useMemo(() => groupHistoryByMonth(history), [history]);
  const sortedMonths = React.useMemo(() => Object.keys(groupedHistory).sort((a,b) => b.localeCompare(a)), [groupedHistory]);

  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="mr-2 h-8 w-8 animate-spin" /> Cargando historial...
            </div>
        );
    }
    
    if (error) {
         return (
            <div className="text-center py-10 text-destructive">
                <AlertTriangle className="mx-auto h-12 w-12" />
                <h3 className="mt-4 text-lg font-semibold">Ocurrió un Error</h3>
                <p>{error}</p>
            </div>
        );
    }

    if (sortedMonths.length > 0) {
      return (
        <Accordion type="multiple" className="w-full space-y-4" defaultValue={[sortedMonths[0]]}>
          {sortedMonths.map((monthKey) => {
            const monthlyTotal = groupedHistory[monthKey].reduce((acc, item) => acc + item.finalPayroll, 0);
            return (
            <AccordionItem key={monthKey} value={monthKey} className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg"><Calendar className="h-6 w-6 text-primary"/></div>
                        <div>
                        <p className="font-semibold text-base capitalize">{format(new Date(monthKey + '-02'), "LLLL yyyy", { locale: es })}</p>
                        <p className="text-sm text-muted-foreground font-normal text-left">{groupedHistory[monthKey].length} registro(s)</p>
                        </div>
                    </div>
                    <div className="text-right pr-4">
                        <p className="text-sm text-muted-foreground">Total del Mes</p>
                        <p className="text-lg font-bold text-primary">${monthlyTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 border-t space-y-4">
                 <Accordion type="multiple" className="w-full space-y-2">
                    {groupedHistory[monthKey].map((item) => (
                    <AccordionItem value={item.id} key={item.id} className="border rounded-md shadow-sm bg-background data-[state=open]:bg-muted/30">
                        <AccordionTrigger className="p-4 hover:no-underline font-normal">
                             <div className="flex justify-between items-start gap-4 w-full">
                                <div>
                                    <h4 className="font-semibold text-lg text-primary text-left">{item.executiveName}</h4>
                                    <p className="text-xs text-muted-foreground text-left">{format(item.date, "PPP p", { locale: es })}</p>
                                </div>
                                <div className="flex items-center gap-6 text-right">
                                    <div>
                                        <p className="text-xs text-green-600 font-semibold">Total Bonos Ganados</p>
                                        <p className="font-bold text-lg text-green-600">${item.totalBonusAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Nómina Final</p>
                                        <p className="text-2xl font-bold text-primary">${item.finalPayroll.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                             <Separator className="mb-4"/>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Nómina Base</p>
                                        <p className="font-semibold">${item.baseSalary.toLocaleString("es-MX")}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Bono Base (100%)</p>
                                        <p className="font-semibold">${item.baseBonus.toLocaleString("es-MX")}</p>
                                    </div>
                                </div>

                                {item.bonuses.length > 0 && (
                                    <div className="space-y-2">
                                        <h5 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground"><Gift className="h-4 w-4"/>Bonos Aplicados</h5>
                                        <div className="space-y-1">
                                        {item.bonuses.map(bono => (
                                            <div key={bono.id} className="text-sm flex justify-between p-1.5 rounded bg-muted/50">
                                                <span>- {bono.name} <span className="text-xs text-muted-foreground">({bono.percentage}%)</span></span>
                                                <span className="font-mono font-medium">+${bono.amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    ))}
                 </Accordion>
              </AccordionContent>
            </AccordionItem>
          )})}
        </Accordion>
      );
    }
    
    return (
        <div className="text-center py-10 text-muted-foreground">
          No hay registros de nómina guardados.
        </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Nómina</CardTitle>
        <CardDescription>
          Consulta el historial de todas las nóminas que se han guardado,
          agrupadas por mes.
        </CardDescription>
      </CardHeader>
      <CardContent>
          {renderContent()}
      </CardContent>
    </Card>
  );
}
