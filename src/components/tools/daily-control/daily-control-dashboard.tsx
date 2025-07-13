"use client";

import * as React from "react";
import {
  Calendar as CalendarIcon,
  PlusCircle,
  ArrowDown,
  ArrowUp,
  CreditCard,
  DollarSign,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from 'date-fns/locale';

import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import type { DailyRecordEntry, DailyRecordType, Plaza } from "@/lib/data";
import { cn } from "@/lib/utils";
import { DailyRecordForm } from "./daily-record-form";


const StatCard = ({ title, value, icon: Icon, variant = 'default' }: { title: string; value: number; icon: React.ElementType; variant?: 'default' | 'destructive' | 'success' }) => {
  const variants = {
    default: 'text-primary',
    destructive: 'text-red-500',
    success: 'text-green-600'
  }
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4 text-muted-foreground", variants[variant])} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", variants[variant])}>
            ${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </CardContent>
    </Card>
  );
};

// Placeholder data - we will replace this with real data later
const placeholderEntries: DailyRecordEntry[] = [
  { id: '1', plazaId: 'p1', date: new Date(), type: 'collected', amount: 500, description: 'Abono cliente X' },
  { id: '2', plazaId: 'p1', date: new Date(), type: 'loaned', amount: 1200, description: 'Préstamo nuevo cliente Y' },
  { id: '3', plazaId: 'p1', date: new Date(), type: 'spent', amount: 150, description: 'Gasolina', category: 'gasolina' },
  { id: '4', plazaId: 'p1', date: new Date(), type: 'collected', amount: 350, description: 'Abono cliente Z' },
]

export function DailyControlDashboard() {
  const { user } = useAuth();
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [plazas, setPlazas] = React.useState<Plaza[]>([]);
  const [selectedPlaza, setSelectedPlaza] = React.useState<string>('');
  const [entries, setEntries] = React.useState<DailyRecordEntry[]>(placeholderEntries);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<DailyRecordType>('collected');

  React.useEffect(() => {
    // Placeholder for fetching plazas
    setIsLoading(false);
  }, [user]);
  
  const handleOpenForm = (mode: DailyRecordType) => {
    setFormMode(mode);
    setFormOpen(true);
  };

  const totals = React.useMemo(() => {
    return entries.reduce((acc, entry) => {
      if (entry.type === 'collected') acc.collected += entry.amount;
      if (entry.type === 'loaned') acc.loaned += entry.amount;
      if (entry.type === 'spent') acc.spent += entry.amount;
      return acc;
    }, { collected: 0, loaned: 0, spent: 0 });
  }, [entries]);

  const typeConfig = {
    collected: { icon: ArrowDown, color: "text-green-600", label: "Cobrado" },
    loaned: { icon: ArrowUp, color: "text-blue-600", label: "Prestado" },
    spent: { icon: CreditCard, color: "text-red-600", label: "Gasto" },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Control Diario</h1>
            <p className="text-muted-foreground">
            Registra y consulta los movimientos financieros de tus plazas.
            </p>
        </div>
        <div className="flex items-center gap-2">
            <Popover>
            <PopoverTrigger asChild>
                <Button
                variant={"outline"}
                className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                )}
                >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                locale={es}
                />
            </PopoverContent>
            </Popover>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Cobrado" value={totals.collected} icon={DollarSign} variant="success" />
        <StatCard title="Total Prestado" value={totals.loaned} icon={ArrowUp} variant="default" />
        <StatCard title="Total Gastado" value={totals.spent} icon={ArrowDown} variant="destructive" />
      </div>

      <Card>
        <CardHeader>
           <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div>
              <CardTitle>Movimientos del Día</CardTitle>
              <CardDescription>Resumen de todos los registros del día seleccionado.</CardDescription>
            </div>
            
            <div className="flex flex-wrap gap-2">
                 <Button onClick={() => handleOpenForm('collected')}>
                    <PlusCircle className="mr-2"/> Registrar Cobro
                </Button>
                <Button variant="outline" onClick={() => handleOpenForm('loaned')}>
                    <PlusCircle className="mr-2"/> Registrar Préstamo
                </Button>
                <Button variant="destructive" onClick={() => handleOpenForm('spent')}>
                    <PlusCircle className="mr-2"/> Registrar Gasto
                </Button>
            </div>
           </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                    </TableRow>
                ) : entries.length > 0 ? (
                    entries.map(entry => {
                        const config = typeConfig[entry.type];
                        return (
                            <TableRow key={entry.id}>
                                <TableCell>
                                    <div className={cn("flex items-center gap-2 font-medium", config.color)}>
                                        <config.icon className="h-4 w-4" />
                                        {config.label}
                                    </div>
                                </TableCell>
                                <TableCell>{entry.description}</TableCell>
                                <TableCell className="capitalize">{entry.category?.replace(/_/g, ' ') || 'N/A'}</TableCell>
                                <TableCell className={cn("text-right font-mono", config.color)}>
                                   ${entry.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </TableCell>
                            </TableRow>
                        )
                    })
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                        No hay registros para este día.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Registrar Movimiento</DialogTitle>
                <DialogDescription>
                    Añade un nuevo registro de tipo '{typeConfig[formMode].label}' para el día seleccionado.
                </DialogDescription>
            </DialogHeader>
            <DailyRecordForm 
                mode={formMode} 
                onSubmit={(data) => {
                    console.log(data);
                    setFormOpen(false);
                }}
            />
        </DialogContent>
      </Dialog>
    </div>
  );
}
