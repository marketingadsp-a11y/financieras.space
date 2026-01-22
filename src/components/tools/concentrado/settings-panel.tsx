
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import type { ConcentradoOficina } from "@/lib/data";
import { getConcentradoOficinas, deleteRegistrosPorSemanas } from "@/services/concentrado-service";
import { format, subMonths, addMonths } from "date-fns";
import { es } from "date-fns/locale";

// This helper needs to be identical to the one in other concentrado files
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


export function ConcentradoSettingsPanel() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [oficinas, setOficinas] = React.useState<ConcentradoOficina[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const [selectedOficinaIds, setSelectedOficinaIds] = React.useState<Set<string>>(new Set());
    const [selectedWeekIndices, setSelectedWeekIndices] = React.useState<Set<number>>(new Set());
    const [currentMonth, setCurrentMonth] = React.useState(new Date());
    const [confirmationCode, setConfirmationCode] = React.useState('');
    
    const DELETION_CODE = "012004";

    React.useEffect(() => {
        if (!user?.prefix) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        getConcentradoOficinas(user.prefix)
            .then(setOficinas)
            .catch(() => toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las oficinas." }))
            .finally(() => setIsLoading(false));
    }, [user?.prefix, toast]);

    const weeksOfMonth = getWeeksForMonth(currentMonth);
    const allOficinasSelected = selectedOficinaIds.size === oficinas.length && oficinas.length > 0;
    const allWeeksSelected = selectedWeekIndices.size === weeksOfMonth.length;

    const handleSelectAllOficinas = (checked: boolean) => {
        if (checked) {
            setSelectedOficinaIds(new Set(oficinas.map(o => o.id)));
        } else {
            setSelectedOficinaIds(new Set());
        }
    };
    
    const handleSelectOficina = (oficinaId: string, checked: boolean) => {
        setSelectedOficinaIds(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(oficinaId);
            } else {
                newSet.delete(oficinaId);
            }
            return newSet;
        });
    };

    const handleSelectAllWeeks = (checked: boolean) => {
        if (checked) {
            setSelectedWeekIndices(new Set(weeksOfMonth.map((_, index) => index)));
        } else {
            setSelectedWeekIndices(new Set());
        }
    };

    const handleSelectWeek = (index: number, checked: boolean) => {
        setSelectedWeekIndices(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(index);
            } else {
                newSet.delete(index);
            }
            return newSet;
        });
    };
    
    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const weekStartDatesToDelete = Array.from(selectedWeekIndices).map(index => weeksOfMonth[index].start);
            await deleteRegistrosPorSemanas(Array.from(selectedOficinaIds), weekStartDatesToDelete);
            toast({ title: "Éxito", description: "Los registros seleccionados han sido eliminados." });
            setConfirmationCode(''); // Reset code
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo completar la eliminación." });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-start gap-4">
              <div className="p-2 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-destructive"/>
              </div>
              <div>
                  <CardTitle>Zona de Peligro</CardTitle>
                  <CardDescription>
                  Acciones irreversibles para eliminar registros de la herramienta Concentrado.
                  </CardDescription>
              </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <h3 className="font-semibold mb-2">1. Selecciona el Mes</h3>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-semibold capitalize w-48 text-center">
                        {format(currentMonth, "LLLL yyyy", { locale: es })}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-semibold mb-2">2. Selecciona Oficinas</h3>
                    {isLoading ? <Loader2 className="animate-spin" /> : (
                         <ScrollArea className="h-48 rounded-md border p-4">
                            <div className="flex items-center space-x-2 mb-2 pb-2 border-b">
                                <Checkbox id="all-oficinas" checked={allOficinasSelected} onCheckedChange={handleSelectAllOficinas} />
                                <Label htmlFor="all-oficinas" className="font-semibold">Seleccionar Todas</Label>
                            </div>
                            {oficinas.map(oficina => (
                                <div key={oficina.id} className="flex items-center space-x-2 my-1">
                                    <Checkbox id={oficina.id} checked={selectedOficinaIds.has(oficina.id)} onCheckedChange={(checked) => handleSelectOficina(oficina.id, !!checked)} />
                                    <Label htmlFor={oficina.id}>{oficina.name}</Label>
                                </div>
                            ))}
                         </ScrollArea>
                    )}
                </div>
                 <div>
                    <h3 className="font-semibold mb-2">3. Selecciona Semanas</h3>
                    <div className="space-y-2 rounded-md border p-4">
                        <div className="flex items-center space-x-2 mb-2 pb-2 border-b">
                            <Checkbox id="all-weeks" checked={allWeeksSelected} onCheckedChange={handleSelectAllWeeks} />
                            <Label htmlFor="all-weeks" className="font-semibold">Seleccionar Todas</Label>
                        </div>
                        {weeksOfMonth.map((week, index) => (
                             <div key={index} className="flex items-center space-x-2 my-1">
                                <Checkbox id={`week-${index}`} checked={selectedWeekIndices.has(index)} onCheckedChange={(checked) => handleSelectWeek(index, !!checked)} />
                                <Label htmlFor={`week-${index}`}>Semana {index + 1}: {format(week.start, 'dd/MM')} - {format(week.end, 'dd/MM')}</Label>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </CardContent>
        <CardFooter>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={selectedOficinaIds.size === 0 || selectedWeekIndices.size === 0}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar Registros Seleccionados
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará <strong>{selectedWeekIndices.size}</strong> semana(s) de datos para <strong>{selectedOficinaIds.size}</strong> oficina(s). Esta acción no se puede deshacer.
                            Para confirmar, ingresa el código de seguridad.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <Label htmlFor="confirmation-code">Código de Seguridad</Label>
                        <Input id="confirmation-code" type="password" value={confirmationCode} onChange={(e) => setConfirmationCode(e.target.value)} placeholder="Ingresa el código para eliminar" autoFocus/>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setConfirmationCode('')}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting || confirmationCode !== DELETION_CODE}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Sí, eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardFooter>
      </Card>
    );
}
