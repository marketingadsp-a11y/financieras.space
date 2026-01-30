
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { ConcentradoSemanal, ConcentradoCierre, RentaItem, PasivoItem } from "@/lib/data";
import { getAllConcentradoRegistros, getCierreMensual, saveCierreMensual } from "@/services/concentrado-service";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, Save, PlusCircle, Trash2 } from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription, } from "@/components/ui/dialog";

// This function needs to be identical to the one in oficina-panel.tsx
function getWeeksForMonth(monthDate: Date): { start: Date; end: Date }[] {
    const year = monthDate.getUTCFullYear();
    const month = monthDate.getUTCMonth();
    
    let firstFridayDate = new Date(Date.UTC(year, month, 1, 12, 0, 0));
    while (firstFridayDate.getUTCDay() !== 5) {
        firstFridayDate.setUTCDate(firstFridayDate.getUTCDate() + 1);
    }

    const firstWeekStart = new Date(firstFridayDate);
    firstWeekStart.setUTCDate(firstFridayDate.getUTCDate() - 6);
    firstWeekStart.setUTCHours(0, 0, 0, 0);

    const weeks = [];
    for (let i = 0; i < 5; i++) {
        const weekStart = new Date(firstWeekStart);
        weekStart.setUTCDate(firstWeekStart.getUTCDate() + (i * 7));

        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
        weekEnd.setUTCHours(23, 59, 59, 999);
        
        if (weekEnd.getUTCMonth() === month) {
            weeks.push({ start: weekStart, end: weekEnd });
        } else if (weeks.length > 0) { 
            break;
        }
    }
    return weeks;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(value);
};


const RentaDialog = ({ onAddRenta }: { onAddRenta: (item: Omit<RentaItem, 'id'>) => void }) => {
    const [description, setDescription] = React.useState('');
    const [amount, setAmount] = React.useState<number | undefined>();
    const [isOpen, setIsOpen] = React.useState(false);


    const handleAdd = () => {
        if (description && amount) {
            onAddRenta({ description, amount });
            setDescription('');
            setAmount(undefined);
            setIsOpen(false);
        }
    }

    return (
         <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline"><PlusCircle className="mr-2"/>Agregar Renta</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Agregar Renta</DialogTitle>
                    <DialogDescription>Añade un nuevo concepto de renta con su descripción y monto.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="renta-desc">Descripción</Label>
                        <Input id="renta-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Renta Oficina Principal" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="renta-amount">Monto</Label>
                        <CurrencyInput id="renta-amount" value={amount} onValueChange={setAmount} placeholder="0.00" />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleAdd} disabled={!description || !amount}>Agregar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const PasivoDialog = ({ onAddPasivo }: { onAddPasivo: (item: Omit<PasivoItem, 'id'>) => void }) => {
    const [description, setDescription] = React.useState('');
    const [amount, setAmount] = React.useState<number | undefined>();
    const [isOpen, setIsOpen] = React.useState(false);


    const handleAdd = () => {
        if (description && amount) {
            onAddPasivo({ description, amount });
            setDescription('');
            setAmount(undefined);
            setIsOpen(false);
        }
    }

    return (
         <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline"><PlusCircle className="mr-2"/>Agregar Pasivo</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Agregar Pasivo</DialogTitle>
                    <DialogDescription>Añade un nuevo concepto de pasivo (gasto) con su descripción y monto.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="pasivo-desc">Concepto</Label>
                        <Input id="pasivo-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Pago de nómina" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pasivo-amount">Monto</Label>
                        <CurrencyInput id="pasivo-amount" value={amount} onValueChange={setAmount} placeholder="0.00" />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleAdd} disabled={!description || !amount}>Agregar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function CierrePanel() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [allRegistros, setAllRegistros] = React.useState<ConcentradoSemanal[]>([]);
    const [cierreData, setCierreData] = React.useState<Omit<ConcentradoCierre, 'id' | 'prefix'>>({
        financieras: 0, multas: 0, interesMesPasado: 0, prestamistasMes: 0, rentas: [], pasivos: []
    });
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);

    const [currentMonth, setCurrentMonth] = React.useState(new Date());

    const fetchData = React.useCallback(async () => {
        if (!user?.prefix) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [registrosData, cierreDataFromDb] = await Promise.all([
                getAllConcentradoRegistros(user.prefix),
                getCierreMensual(user.prefix, currentMonth),
            ]);
            setAllRegistros(registrosData || []);
            setCierreData(cierreDataFromDb);
            
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos de cierre." });
        } finally {
            setIsLoading(false);
        }
    }, [user?.prefix, toast, currentMonth]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
    
    const handleManualDataChange = (field: keyof typeof cierreData, value: number) => {
        setCierreData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddRenta = (item: Omit<RentaItem, 'id'>) => {
        setCierreData(prev => ({
            ...prev,
            rentas: [...(prev.rentas || []), { ...item, id: `r${Date.now()}` }]
        }));
    }
    
    const handleRemoveRenta = (id: string) => {
        setCierreData(prev => ({
            ...prev,
            rentas: (prev.rentas || []).filter(r => r.id !== id)
        }));
    }

    const handleAddPasivo = (item: Omit<PasivoItem, 'id'>) => {
        setCierreData(prev => ({
            ...prev,
            pasivos: [...(prev.pasivos || []), { ...item, id: `p${Date.now()}` }]
        }));
    }
    
    const handleRemovePasivo = (id: string) => {
        setCierreData(prev => ({
            ...prev,
            pasivos: (prev.pasivos || []).filter(p => p.id !== id)
        }));
    }
    
    const handleSaveCierre = async () => {
        if (!user?.prefix) return;
        setIsSaving(true);
        try {
            await saveCierreMensual({ ...cierreData, prefix: user.prefix }, currentMonth);
            toast({ title: 'Éxito', description: 'Datos de cierre guardados.' });
        } catch (error) {
             toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los datos." });
        } finally {
            setIsSaving(false);
        }
    }

    const weeksOfMonth = React.useMemo(() => getWeeksForMonth(currentMonth), [currentMonth]);
    
    const weeklyTotals = React.useMemo(() => {
        if (!weeksOfMonth.length || !allRegistros.length) return [];
        return weeksOfMonth.map((week) => {
            const registrosDeLaSemana = allRegistros.filter(r => {
                const registroDateUTC = new Date(r.weekStartDate).getTime();
                const weekStartUTC = new Date(week.start).getTime();
                return registroDateUTC === weekStartUTC;
            });
            return registrosDeLaSemana.reduce((sum, r) => sum + (r.cajaChica || 0), 0);
        });
    }, [allRegistros, weeksOfMonth]);

    const totalCajaChicaSemanas = (weeklyTotals || []).reduce((sum, total) => sum + total, 0);
    
    const monthlyConceptTotals = React.useMemo(() => {
        if (!allRegistros.length) {
             return { capitalMensual: 0, interesMensual: 0, carteraVencida: 0, seguros: 0 };
        }
        const monthRegistros = allRegistros.filter(r => {
            const registroDate = new Date(r.weekStartDate);
            return weeksOfMonth.some(week => registroDate >= week.start && registroDate <= week.end);
        });
        return monthRegistros.reduce((acc, r) => {
            acc.capitalMensual += r.capitalMensual || 0;
            acc.interesMensual += r.interesMensual || 0;
            acc.carteraVencida += r.carteraVencida || 0;
            acc.seguros += r.seguros || 0;
            return acc;
        }, { capitalMensual: 0, interesMensual: 0, carteraVencida: 0, seguros: 0 });
    }, [allRegistros, weeksOfMonth]);
    
    const totalRentas = (cierreData?.rentas || []).reduce((sum, r) => sum + r.amount, 0);
    const totalPasivos = (cierreData?.pasivos || []).reduce((sum, p) => sum + p.amount, 0);

    const totalAEntregar = 
        totalCajaChicaSemanas +
        monthlyConceptTotals.capitalMensual +
        monthlyConceptTotals.interesMensual +
        monthlyConceptTotals.carteraVencida +
        monthlyConceptTotals.seguros +
        (cierreData?.financieras || 0) +
        (cierreData?.multas || 0) +
        (cierreData?.interesMesPasado || 0) +
        (cierreData?.prestamistasMes || 0) -
        totalRentas -
        totalPasivos;


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Cargando datos de Cierre...</span>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <CardTitle>Cierre Mensual</CardTitle>
                            <CardDescription>Resumen total de las oficinas y registro de conceptos manuales para el cierre del mes.</CardDescription>
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
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>CAJAS CHICAS</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {(weeklyTotals || []).map((total, index) => {
                           if (index < weeksOfMonth.length) {
                             return (
                                <div key={index} className="flex justify-between items-center p-3 rounded-md bg-muted/50">
                                    <span className="font-semibold">Semana {index + 1}</span>
                                    <span className="font-mono text-lg">{formatCurrency(total)}</span>
                                </div>
                            )
                           }
                           return null;
                        })}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="space-y-2 pt-6">
                        <div className="flex justify-between items-center p-3 rounded-md bg-muted/50">
                            <span className="font-semibold">Capital Mensual</span>
                            <span className="font-mono text-lg">{formatCurrency(monthlyConceptTotals.capitalMensual)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-md bg-muted/50">
                            <span className="font-semibold">Interés Mensual</span>
                            <span className="font-mono text-lg">{formatCurrency(monthlyConceptTotals.interesMensual)}</span>
                        </div>
                         <div className="flex justify-between items-center p-3 rounded-md bg-muted/50">
                            <span className="font-semibold">Cobranza Cartera Vencida</span>
                            <span className="font-mono text-lg">{formatCurrency(monthlyConceptTotals.carteraVencida)}</span>
                        </div>
                         <div className="flex justify-between items-center p-3 rounded-md bg-muted/50">
                            <span className="font-semibold">Cobranza de Seguros</span>
                            <span className="font-mono text-lg">{formatCurrency(monthlyConceptTotals.seguros)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>Registros Manuales del Cierre</CardTitle>
                    <CardDescription>Ingresa los montos correspondientes a estos conceptos para el mes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1"><Label>Financieras</Label><CurrencyInput value={cierreData.financieras} onValueChange={(v) => handleManualDataChange('financieras', v || 0)} /></div>
                        <div className="space-y-1"><Label>Multas</Label><CurrencyInput value={cierreData.multas} onValueChange={(v) => handleManualDataChange('multas', v || 0)} /></div>
                        <div className="space-y-1"><Label>Interés Mes Pasado</Label><CurrencyInput value={cierreData.interesMesPasado} onValueChange={(v) => handleManualDataChange('interesMesPasado', v || 0)} /></div>
                        <div className="space-y-1"><Label>Prestamistas Mes</Label><CurrencyInput value={cierreData.prestamistasMes} onValueChange={(v) => handleManualDataChange('prestamistasMes', v || 0)} /></div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>Rentas</Label>
                                <RentaDialog onAddRenta={handleAddRenta} />
                            </div>
                            <div className="border rounded-lg p-2 space-y-1 min-h-[100px]">
                                {(cierreData?.rentas || []).length > 0 ? (
                                    (cierreData.rentas || []).map(renta => (
                                        <div key={renta.id} className="flex justify-between items-center p-1.5 rounded-md hover:bg-muted">
                                            <span className="text-sm">{renta.description}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono">{formatCurrency(renta.amount)}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveRenta(renta.id)}><Trash2 className="h-4 w-4"/></Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (<p className="text-sm text-muted-foreground text-center p-2">No hay rentas registradas.</p>)}
                            </div>
                            <div className="flex justify-between items-center font-bold p-2 bg-muted rounded-md">
                                <span>Total de Rentas</span>
                                <span>{formatCurrency(totalRentas)}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>Pasivos (Gastos)</Label>
                                <PasivoDialog onAddPasivo={handleAddPasivo} />
                            </div>
                            <div className="border rounded-lg p-2 space-y-1 min-h-[100px]">
                                {(cierreData?.pasivos || []).length > 0 ? (
                                    (cierreData.pasivos || []).map(pasivo => (
                                        <div key={pasivo.id} className="flex justify-between items-center p-1.5 rounded-md hover:bg-muted">
                                            <span className="text-sm">{pasivo.description}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono">{formatCurrency(pasivo.amount)}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemovePasivo(pasivo.id)}><Trash2 className="h-4 w-4"/></Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (<p className="text-sm text-muted-foreground text-center p-2">No hay pasivos registrados.</p>)}
                            </div>
                            <div className="flex justify-between items-center font-bold p-2 bg-muted rounded-md">
                                <span>Total de Pasivos</span>
                                <span>{formatCurrency(totalPasivos)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveCierre} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2"/>}
                        Guardar Datos del Cierre
                    </Button>
                </CardFooter>
             </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-2xl overflow-hidden">
                <div className="relative p-8">
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full opacity-50"></div>
                    <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 bg-white/10 rounded-full opacity-50"></div>
                    <div className="relative text-center">
                        <CardTitle className="text-xl font-semibold tracking-wider uppercase">Total a Entregar</CardTitle>
                        <div className="my-6">
                            <span className="text-6xl font-bold tracking-tighter animate-pulse">{formatCurrency(totalAEntregar)}</span>
                        </div>
                        <CardDescription className="text-indigo-200">Este es el resultado final del cierre del mes, restando las rentas y pasivos.</CardDescription>
                    </div>
                </div>
            </Card>
        </div>
    );
}
