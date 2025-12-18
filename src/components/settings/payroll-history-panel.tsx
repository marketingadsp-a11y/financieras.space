
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Loader2, Calendar, User, DollarSign, AlertTriangle, Gift, TrendingUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getPayrollHistory, deletePayroll } from "@/services/payroll-service";
import { getCompensationConfig } from "@/services/compensation-service";
import type { PayrollHistory, Executive } from "@/lib/data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, getMonth, getYear } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Trash2 } from "lucide-react";


export const PayrollRecordAccordionItem = ({ item, onDelete }: { item: PayrollHistory, onDelete: (id: string) => void }) => {
    const [isAlertOpen, setIsAlertOpen] = React.useState(false);
    const [confirmationCode, setConfirmationCode] = React.useState('');
    const expectedCode = '0120';

    const handleDelete = () => {
        if (confirmationCode === expectedCode) {
            onDelete(item.id);
            setIsAlertOpen(false);
            setConfirmationCode('');
        }
    }

    return (
        <AccordionItem value={item.id} className="border-b-0">
            <div className="border rounded-md shadow-sm bg-background data-[state=open]:bg-muted/30 group">
                <div className="flex items-center p-4">
                    <AccordionTrigger className="p-0 hover:no-underline font-normal text-left flex-1">
                        <div className="flex justify-between items-center gap-4 w-full">
                            <div className="text-left">
                                <h4 className="font-semibold text-lg text-primary">{item.executiveName}</h4>
                                <p className="text-xs text-muted-foreground">{format(item.date, "PPP p", { locale: es })}</p>
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
                     <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                        <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar Eliminación?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción es irreversible. Para eliminar el registro de nómina de <strong>{item.executiveName}</strong> del <strong>{format(item.date, "PPP", { locale: es })}</strong>, ingresa el código de confirmación.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-2">
                                <Label htmlFor="confirmation-code">Código de Confirmación</Label>
                                <Input id="confirmation-code" type="password" value={confirmationCode} onChange={(e) => setConfirmationCode(e.target.value)} placeholder="Ingresa el código para eliminar" autoFocus />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setConfirmationCode('')}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} disabled={confirmationCode !== expectedCode}>Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

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
                        {item.bonuses && item.bonuses.length > 0 && (
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
            </div>
        </AccordionItem>
    );
};


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
  const [executives, setExecutives] = React.useState<Executive[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedExecutiveId, setSelectedExecutiveId] = React.useState<string | null>(null);


  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const [historyData, compensationData] = await Promise.all([
        getPayrollHistory(user.prefix),
        getCompensationConfig(user.prefix)
      ]);
      setHistory(historyData);
      setExecutives(compensationData.executives || []);
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
  }, [user?.prefix, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleDeletePayroll = async (id: string) => {
    try {
        await deletePayroll(id);
        toast({ title: "Éxito", description: "Registro de nómina eliminado." });
        fetchData();
    } catch (e: any) {
        toast({ variant: "destructive", title: "Error", description: e.message || "No se pudo eliminar el registro." });
    }
  };

  const groupedHistory = React.useMemo(() => groupHistoryByMonth(history), [history]);
  const sortedMonths = React.useMemo(() => Object.keys(groupedHistory).sort((a,b) => b.localeCompare(a)), [groupedHistory]);
  
  const executiveHistory = React.useMemo(() => {
    if (!selectedExecutiveId) return [];
    return history.filter(h => h.executiveId === selectedExecutiveId);
  }, [history, selectedExecutiveId]);

  const executiveSummary = React.useMemo(() => {
    if (executiveHistory.length === 0) return { totalPaid: 0, averagePayment: 0 };
    const totalPaid = executiveHistory.reduce((acc, item) => acc + item.finalPayroll, 0);
    return {
        totalPaid,
        averagePayment: totalPaid / executiveHistory.length,
    }
  }, [executiveHistory]);

  const renderByMonth = () => {
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
              <AccordionContent className="p-4 border-t space-y-2">
                 <Accordion type="multiple" className="w-full space-y-2">
                    {groupedHistory[monthKey].map((item) => (
                      <PayrollRecordAccordionItem key={item.id} item={item} onDelete={handleDeletePayroll} />
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
  }

  const renderByExecutive = () => {
      return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select onValueChange={setSelectedExecutiveId} value={selectedExecutiveId || ""}>
                    <SelectTrigger className="md:col-span-1">
                        <SelectValue placeholder="Selecciona un ejecutivo..." />
                    </SelectTrigger>
                    <SelectContent>
                        {executives.map(exec => (
                            <SelectItem key={exec.id} value={exec.id}>{exec.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {selectedExecutiveId && (
                     <>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Pagado al Ejecutivo</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-primary">${executiveSummary.totalPaid.toLocaleString("es-MX")}</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pago Promedio</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">${executiveSummary.averagePayment.toLocaleString("es-MX")}</p>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
            {selectedExecutiveId ? (
                executiveHistory.length > 0 ? (
                    <Accordion type="multiple" className="w-full space-y-2">
                        {executiveHistory.map(item => (
                             <PayrollRecordAccordionItem key={item.id} item={item} onDelete={handleDeletePayroll} />
                        ))}
                    </Accordion>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">No hay registros para este ejecutivo.</div>
                )
            ) : (
                <div className="text-center py-10 text-muted-foreground">Por favor, selecciona un ejecutivo para ver su historial.</div>
            )}
        </div>
      );
  }

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

    return (
        <Tabs defaultValue="por-mes">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="por-mes">Historial por Mes</TabsTrigger>
                <TabsTrigger value="por-ejecutivo">Historial por Ejecutivo</TabsTrigger>
            </TabsList>
            <TabsContent value="por-mes" className="mt-4">
                {renderByMonth()}
            </TabsContent>
            <TabsContent value="por-ejecutivo" className="mt-4">
                {renderByExecutive()}
            </TabsContent>
        </Tabs>
    );
  };

  return (
    <Card>
      <CardContent className="pt-6">
          {renderContent()}
      </CardContent>
    </Card>
  );
}
