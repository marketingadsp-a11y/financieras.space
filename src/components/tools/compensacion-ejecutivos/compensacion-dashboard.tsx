
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { DollarSign, User, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getCompensationConfig } from "@/services/compensation-service";
import { savePayroll } from "@/services/payroll-service";
import type { Executive, Bonus, CompensationConfig, SavedBonus } from "@/lib/data";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function CompensacionDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = React.useState<CompensationConfig>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  
  const [selectedExecutiveId, setSelectedExecutiveId] = React.useState<string | null>(null);
  const [selectedBonusIds, setSelectedBonusIds] = React.useState<Set<string>>(new Set());

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
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin mr-2" /> Cargando configuración...</div>
  }

  return (
    <div className="w-full">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">Cálculo de Compensación</CardTitle>
          <CardDescription>
            Selecciona un ejecutivo para calcular su nómina final basada en los bonos obtenidos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          <div className="space-y-2">
            <Label htmlFor="executive-select" className="text-lg font-semibold">1. Seleccionar Ejecutivo</Label>
            <Select onValueChange={handleExecutiveChange} value={selectedExecutiveId || ""}>
                <SelectTrigger id="executive-select">
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
          </div>
          
          {selectedExecutive && (
            <>
              <Separator />
              <div className="space-y-4">
                 <h3 className="text-xl font-semibold">2. Asignar Bonos</h3>
                  {(config.bonuses && config.bonuses.length > 0) ? (
                    <div className="flex flex-wrap gap-2">
                        {config.bonuses.map((bono) => (
                            <div 
                                key={bono.id} 
                                className="flex flex-grow items-center p-3 border rounded-lg cursor-pointer transition-colors has-[:checked]:bg-primary/10 has-[:checked]:border-primary"
                                onClick={() => handleBonusToggle(bono.id)}
                            >
                                <Checkbox 
                                    id={bono.id} 
                                    checked={selectedBonusIds.has(bono.id)}
                                    onCheckedChange={() => handleBonusToggle(bono.id)}
                                />
                                <Label htmlFor={bono.id} className="ml-3 text-sm font-medium cursor-pointer flex-grow">
                                  {bono.name}
                                </Label>
                                <span className="ml-2 text-xs font-bold text-primary">({bono.percentage}%)</span>
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
    </div>
  );
}
