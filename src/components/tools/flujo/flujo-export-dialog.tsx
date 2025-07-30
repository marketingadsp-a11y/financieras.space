
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { FlujoSucursal } from "@/lib/data";
import { Loader2, CalendarIcon, FileSpreadsheet, FileText } from "lucide-react";
import { addDays, format, startOfDay, startOfWeek, endOfWeek } from "date-fns";
import { DateRange } from "react-day-picker";
import { es } from "date-fns/locale";


type FlujoExportDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  sucursales: FlujoSucursal[];
  onExport: (sucursalIds: string[], startDate: Date | null, endDate: Date | null, format: 'pdf' | 'excel') => Promise<void>;
  isExporting: boolean;
};

export function FlujoExportDialog({ isOpen, onClose, sucursales, onExport, isExporting }: FlujoExportDialogProps) {
  const [selectedSucursalIds, setSelectedSucursalIds] = React.useState<string[]>(['all']);
  const [dateRangeType, setDateRangeType] = React.useState<'current' | 'all' | 'custom'>('current');
  const [customDate, setCustomDate] = React.useState<DateRange | undefined>({
    from: startOfWeek(new Date(), { weekStartsOn: 6 }),
    to: endOfWeek(new Date(), { weekStartsOn: 6 }),
  });

  const handleSucursalSelect = (sucursalId: string) => {
    setSelectedSucursalIds(prev => {
        if (sucursalId === 'all') {
            return prev.includes('all') ? prev.filter(id => id !== 'all') : ['all'];
        }
        const newSelection = prev.filter(id => id !== 'all');
        if (newSelection.includes(sucursalId)) {
            return newSelection.filter(id => id !== sucursalId);
        }
        return [...newSelection, sucursalId];
    });
  };

  const isAllSelected = selectedSucursalIds.includes('all');
  
  const handleExportClick = (formatType: 'pdf' | 'excel') => {
    let start: Date | null = null;
    let end: Date | null = null;

    if (dateRangeType === 'current') {
        start = startOfWeek(new Date(), { weekStartsOn: 6 });
        end = endOfWeek(new Date(), { weekStartsOn: 6 });
    } else if (dateRangeType === 'all') {
        start = null; 
        end = null;
    } else if (dateRangeType === 'custom' && customDate?.from) {
        start = startOfDay(customDate.from);
        end = customDate.to ?? customDate.from;
    } else { // Default to current week if something is off
        start = startOfWeek(new Date(), { weekStartsOn: 6 });
        end = endOfWeek(new Date(), { weekStartsOn: 6 });
    }
    
    if (end) {
        end.setHours(23, 59, 59, 999);
    }

    onExport(isAllSelected ? sucursales.map(s => s.id) : selectedSucursalIds, start, end, formatType);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Reporte de Flujo</DialogTitle>
          <DialogDescription>
            Selecciona las sucursales, el rango de fechas y el formato para tu reporte.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
            <div className="space-y-2">
                <Label>1. Seleccionar Sucursales</Label>
                <ScrollArea className="h-32 rounded-md border p-2">
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="all-sucursales" checked={isAllSelected} onCheckedChange={() => handleSucursalSelect('all')} />
                            <Label htmlFor="all-sucursales" className="font-semibold">Todas las sucursales</Label>
                        </div>
                        <hr/>
                        {sucursales.map(s => (
                            <div key={s.id} className="flex items-center space-x-2">
                                <Checkbox id={s.id} checked={isAllSelected || selectedSucursalIds.includes(s.id)} onCheckedChange={() => handleSucursalSelect(s.id)} disabled={isAllSelected} />
                                <Label htmlFor={s.id}>{s.name}</Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
             <div className="space-y-2">
                <Label>2. Seleccionar Rango de Fechas</Label>
                <RadioGroup value={dateRangeType} onValueChange={(val) => setDateRangeType(val as any)} className="space-y-1">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="current" id="r-current"/><Label htmlFor="r-current">Semana actual</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="r-all"/><Label htmlFor="r-all">Historial completo</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="custom" id="r-custom"/><Label htmlFor="r-custom">Rango personalizado</Label></div>
                </RadioGroup>
                {dateRangeType === 'custom' && (
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn("w-full justify-start text-left font-normal", !customDate && "text-muted-foreground")}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customDate?.from ? (
                            customDate.to ? (
                                <>
                                {format(customDate.from, "LLL dd, y", { locale: es })} -{" "}
                                {format(customDate.to, "LLL dd, y", { locale: es })}
                                </>
                            ) : (
                                format(customDate.from, "LLL dd, y", { locale: es })
                            )
                            ) : (
                            <span>Selecciona un rango</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={customDate?.from}
                            selected={customDate}
                            onSelect={setCustomDate}
                            numberOfMonths={2}
                            locale={es}
                        />
                        </PopoverContent>
                    </Popover>
                )}
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <div className="flex gap-2">
            <Button onClick={() => handleExportClick('pdf')} disabled={isExporting || selectedSucursalIds.length === 0}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileText className="mr-2 h-4 w-4"/>}
                PDF
            </Button>
            <Button onClick={() => handleExportClick('excel')} disabled={isExporting || selectedSucursalIds.length === 0}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileSpreadsheet className="mr-2 h-4 w-4"/>}
                Excel
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
