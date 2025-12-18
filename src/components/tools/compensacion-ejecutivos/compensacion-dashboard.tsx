
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { DollarSign, User, Loader2, Save, History, TrendingUp, icons } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getCompensationConfig } from "@/services/compensation-service";
import { savePayroll, getPayrollHistoryByExecutive } from "@/services/payroll-service";
import type { Executive, Bonus, CompensationConfig, SavedBonus, PayrollHistory } from "@/lib/data";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Accordion } from "@/components/ui/accordion";
import { PayrollRecordAccordionItem } from "@/components/settings/payroll-history-panel";

// Helper to get a Lucide icon by name
const LucideIcon = ({ name, ...props }: { name: keyof typeof icons } & React.ComponentProps<"svg">) => {
  const Icon = icons[name];
  if (!Icon) {
    // Return a default icon or null if the name is invalid
    return <DollarSign {...props} />;
  }
  return <Icon {...props} />;
};


const HistoryModal = ({
  isOpen,
  onClose,
  executive,
}: {
  isOpen: boolean,
  onClose: () => void,
  executive: Executive | undefined,
}) => {
    const [history, setHistory] = React.useState<PayrollHistory[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const { toast } = useToast();

    React.useEffect(() => {
        if (isOpen && executive) {
            setIsLoading(true);
            getPayrollHistoryByExecutive(executive.id)
                .then(setHistory)
                .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el historial.' }))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, executive, toast]);
    
    const executiveSummary = React.useMemo(() => {
        if (history.length === 0) return { totalPaid: 0, averagePayment: 0 };
        const totalPaid = history.reduce((acc, item) => acc + item.finalPayroll, 0);
        return {
            totalPaid,
            averagePayment: totalPaid / history.length,
        }
    }, [history]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Historial de Nómina para {executive?.name}</DialogTitle>
                </DialogHeader>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Pagado al Ejecutivo</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-primary">${executiveSummary.totalPaid.toLocaleString("es-MX", {minimumFractionDigits: 2})}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pago Promedio</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">${executiveSummary.averagePayment.toLocaleString("es-MX", {minimumFractionDigits: 2})}</p>
                        </CardContent>
                    </Card>
                </div>

                <ScrollArea className="max-h-[50vh]">
                     <div className="pr-4 py-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-40"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Cargando historial...</div>
                        ) : history.length > 0 ? (
                            <Accordion type="multiple" className="w-full space-y-2">
                                {history.map(item => (
                                    <PayrollRecordAccordionItem key={item.id} item={item} />
                                ))}
                            </Accordion>
                        ) : (
                            <p className="text-center text-muted-foreground">No hay registros de nómina para este ejecutivo.</p>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

export function CompensacionDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = React.useState<CompensationConfig>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  
  const [selectedExecutiveId, setSelectedExecutiveId] = React.useState<string | null>(null);
  const [selectedBonusIds, setSelectedBonusIds] = React.useState<Set<string>>(new Set());

  const [isHistoryModalOpen, setIsHistoryModalOpen] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!user?.prefix) {
        setIsLoading(false);
        return;
      }
      try {
        const fullConfig = await getCompensationConfig(user.prefix);
        setConfig(fullConfig);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la configuración de compensación." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user?.prefix, toast]);

  const handleBonusToggle = (bonusId: string) => {
    setSelectedBonusIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bonusId)) {
        newSet.delete(bonusId);
      } else {
        newSet.add(bonusId);
      }
      return newSet;
    });
  };

  const handleExecutiveChange = (executiveId: string) => {
    setSelectedExecutiveId(executiveId);
    setSelectedBonusIds(new Set()); // Reset bonuses when changing executive
  };
  
  const handleSavePayroll = async () => {
    if (!user?.prefix || !selectedExecutiveId || !selectedExecutive) {
        toast({ variant: 'destructive', title: 'Error', description: 'Por favor, selecciona un ejecutivo.'});
        return;
    }
    setIsSaving(true);
    try {
        const savedBonuses: SavedBonus[] = Array.from(selectedBonusIds).map(bonusId => {
            const bonusDetails = config.bonuses?.find(b => b.id === bonusId);
            if (!bonusDetails) return null;
            return {
                id: bonusDetails.id,
                name: bonusDetails.name,
                percentage: bonusDetails.percentage,
                amount: bonoBase * (bonusDetails.percentage / 100),
            };
        }).filter((b): b is SavedBonus => b !== null);

        await savePayroll({
            prefix: user.prefix,
            executiveId: selectedExecutiveId,
            executiveName: selectedExecutive.name,
            baseSalary: nominaBase,
            baseBonus: bonoBase,
            bonuses: savedBonuses,
            totalBonusAmount: totalBonusAmount,
            finalPayroll: nominaFinal,
        });

        toast({ title: 'Éxito', description: `Nómina para ${selectedExecutive.name} guardada.`});
        // Optionally reset after saving
        setSelectedBonusIds(new Set());

    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la nómina.'});
    } finally {
        setIsSaving(false);
    }
  };

  const selectedExecutive = config.executives?.find(e => e.id === selectedExecutiveId);
  
  const nominaBase = config.baseSalary || 0;
  const bonoBase = config.baseBonus || 0;

  const totalBonusAmount = React.useMemo(() => {
    if (!config.bonuses) return 0;
    return Array.from(selectedBonusIds).reduce((total, bonusId) => {
        const bonus = config.bonuses!.find(b => b.id === bonusId);
        if (bonus) {
            return total + (bonoBase * (bonus.percentage / 100));
        }
        return total;
    }, 0);
  }, [selectedBonusIds, config.bonuses, bonoBase]);

  const nominaFinal = nominaBase + totalBonusAmount;
  
  const getBonusIcon = (bonusName: string): keyof typeof icons => {
    const name = bonusName.toLowerCase();
    if (name.includes('recopilador')) return 'HandCoins';
    if (name.includes('ubicación')) return 'MapPin';
    if (name.includes('reporte')) return 'FileText';
    if (name.includes('falla')) return 'TrendingDown';
    return 'Award'; // Default icon
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin mr-2" /> Cargando configuración...</div>
  }

  return (
    <div className="w-full">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">Cálculo de Compensación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          
          <div className="space-y-2">
            <Label htmlFor="executive-select" className="text-lg font-semibold">1. Seleccionar Ejecutivo</Label>
             <div className="flex items-center gap-2">
                <Select onValueChange={handleExecutiveChange} value={selectedExecutiveId || ""}>
                    <SelectTrigger id="executive-select" className="flex-grow">
                        <SelectValue placeholder="Elige un ejecutivo..." />
                    </SelectTrigger>
                    <SelectContent>
                        {config.executives && config.executives.length > 0 ? (
                            config.executives.map(exec => (
                                <SelectItem key={exec.id} value={exec.id}>{exec.name} ({exec.plaza})</SelectItem>
                            ))
                        ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground">No hay ejecutivos registrados.</div>
                        )}
                    </SelectContent>
                </Select>
                 {selectedExecutive && (
                    <Button variant="outline" onClick={() => setIsHistoryModalOpen(true)}>
                        <History className="mr-2 h-4 w-4"/>
                        Historial
                    </Button>
                )}
             </div>
          </div>
          
          {selectedExecutive && (
            <>
              <Separator />
              <div className="space-y-4">
                 <h3 className="text-xl font-semibold">2. Asignar Bonos</h3>
                  {(config.bonuses && config.bonuses.length > 0) ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {config.bonuses.map((bono) => (
                            <div 
                                key={bono.id} 
                                className="flex flex-col items-center justify-start gap-2 p-3 border rounded-lg cursor-pointer transition-colors has-[:checked]:bg-primary/10 has-[:checked]:border-primary"
                                onClick={() => handleBonusToggle(bono.id)}
                            >
                                <LucideIcon name={getBonusIcon(bono.name)} className="h-6 w-6 text-muted-foreground mb-1" />
                                <Label htmlFor={bono.id} className="text-xs text-center font-medium cursor-pointer flex-grow leading-tight">
                                  {bono.name} ({bono.percentage}%)
                                </Label>
                                 <Checkbox 
                                    id={bono.id} 
                                    checked={selectedBonusIds.has(bono.id)}
                                    onCheckedChange={() => handleBonusToggle(bono.id)}
                                />
                            </div>
                        ))}
                    </div>
                  ) : (
                     <div className="p-4 text-center text-sm text-muted-foreground border rounded-lg">No hay bonos configurados.</div>
                  )}
              </div>
              
              <Separator />
              
              <div className="space-y-6">
                 <h3 className="text-xl font-semibold">3. Resumen de Nómina</h3>
                 <div className="grid md:grid-cols-3 gap-6">
                    <div className="p-6 bg-muted/30 rounded-lg">
                        <Label className="text-md font-semibold">Nómina Base</Label>
                        <div className="flex items-baseline gap-2 mt-2">
                            <DollarSign className="h-6 w-6 text-muted-foreground" />
                            <p className="text-4xl font-bold">{nominaBase.toLocaleString('es-MX')}</p>
                        </div>
                    </div>
                     <div className="p-6 bg-green-500/10 rounded-lg">
                        <Label className="text-md font-semibold text-green-800 dark:text-green-300">Bono Total Ganado</Label>
                        <div className="flex items-baseline gap-2 mt-2">
                            <DollarSign className="h-6 w-6 text-green-700" />
                            <p className="text-4xl font-bold text-green-700">{totalBonusAmount.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
                        </div>
                    </div>
                     <div className="p-6 bg-primary/10 rounded-lg">
                        <Label className="text-md font-semibold text-primary">Nómina Final</Label>
                         <div className="flex items-baseline gap-2 mt-2">
                            <DollarSign className="h-6 w-6 text-primary" />
                            <p className="text-4xl font-bold text-primary">{nominaFinal.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
                        </div>
                    </div>
                 </div>
              </div>
            </>
          )}

        </CardContent>
        {selectedExecutive && (
            <CardFooter className="border-t pt-6">
                <Button size="lg" onClick={handleSavePayroll} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>}
                    {isSaving ? 'Guardando...' : 'Guardar Nómina'}
                </Button>
            </CardFooter>
        )}
      </Card>
      
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        executive={selectedExecutive}
      />
    </div>
  );
}
