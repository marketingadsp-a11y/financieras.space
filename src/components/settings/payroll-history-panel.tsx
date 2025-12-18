
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Calendar, User, DollarSign } from "lucide-react";
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

  React.useEffect(() => {
    const fetchData = async () => {
      if (!user?.prefix) {
        setIsLoading(false);
        return;
      }
      try {
        const historyData = await getPayrollHistory(user.prefix);
        setHistory(historyData);
      } catch (error) {
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-40">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" /> Cargando historial...
        </CardContent>
      </Card>
    );
  }

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
        {sortedMonths.length > 0 ? (
          <Accordion type="multiple" className="w-full space-y-4">
            {sortedMonths.map((monthKey) => (
              <AccordionItem key={monthKey} value={monthKey} className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-4">
                     <div className="p-2 bg-primary/10 rounded-lg"><Calendar className="h-6 w-6 text-primary"/></div>
                     <div>
                        <p className="font-semibold text-base capitalize">{format(new Date(monthKey + '-02'), "LLLL yyyy", { locale: es })}</p>
                        <p className="text-sm text-muted-foreground font-normal">{groupedHistory[monthKey].length} registro(s)</p>
                     </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 border-t space-y-4">
                  {groupedHistory[monthKey].map((item) => (
                    <div key={item.id} className="p-4 border rounded-md bg-muted/20">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h4 className="font-semibold text-primary">{item.executiveName}</h4>
                                <p className="text-xs text-muted-foreground">{format(item.date, "PPP p", { locale: es })}</p>
                            </div>
                             <Badge variant="secondary" className="text-lg">
                                Nómina Final: ${item.finalPayroll.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </Badge>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <p className="flex justify-between"><span>Nómina Base:</span> <span className="font-medium">${item.baseSalary.toLocaleString("es-MX")}</span></p>
                            <p className="flex justify-between"><span>Bono Base (100%):</span> <span className="font-medium">${item.baseBonus.toLocaleString("es-MX")}</span></p>
                            <p className="flex justify-between text-green-600"><span>Total Bonos Ganados:</span> <span className="font-bold">${item.totalBonusAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span></p>
                        </div>
                        {item.bonuses.length > 0 && (
                            <div className="mt-2 pt-2 border-t">
                                <h5 className="text-xs font-semibold text-muted-foreground mb-1">Bonos Aplicados:</h5>
                                <div className="space-y-1">
                                {item.bonuses.map(bono => (
                                    <p key={bono.id} className="text-xs flex justify-between"><span>- {bono.name} ({bono.percentage}%):</span> <span className="font-mono">+${bono.amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span></p>
                                ))}
                                </div>
                            </div>
                        )}
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            No hay registros de nómina guardados.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
