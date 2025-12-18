
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
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
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, User, Percent, DollarSign, Edit, Trash2 } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";

// Mock data - to be replaced with Firestore data
const mockExecutives = [
    { id: '1', name: 'JUAN PEREZ' },
    { id: '2', name: 'MARIA GARCIA' },
];

const mockBonuses = [
    { id: 'b1', name: 'Fallo menor al 2%', percentage: 50 },
    { id: 'b2', name: 'Recopilador', percentage: 15 },
    { id: 'b3', name: 'Ubicación', percentage: 15 },
    { id: 'b4', name: 'Reporte del Sábado', percentage: 20 },
]

export function CompensationsManagement() {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate loading data
    setTimeout(() => setIsLoading(false), 500);
  }, []);


  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando...</span>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Nómina Base</CardTitle>
                    <CardDescription>Define el sueldo base semanal para todos los ejecutivos.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="space-y-2">
                        <Label htmlFor="base-salary">Monto de la Nómina Base</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <CurrencyInput
                                id="base-salary"
                                value={4000}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button>Guardar Nómina Base</Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Bonos de Rendimiento</CardTitle>
                            <CardDescription>Crea y gestiona los bonos disponibles.</CardDescription>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button size="sm"><PlusCircle className="mr-2 h-4 w-4"/>Agregar Bono</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Nuevo Bono</DialogTitle>
                                </DialogHeader>
                                {/* Form will go here */}
                                <p>Formulario para agregar bono.</p>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre del Bono</TableHead>
                                <TableHead className="w-[100px] text-right">Porcentaje</TableHead>
                                <TableHead className="w-[100px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockBonuses.map(bono => (
                                <TableRow key={bono.id}>
                                    <TableCell className="font-medium">{bono.name}</TableCell>
                                    <TableCell className="text-right font-mono">{bono.percentage}%</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
        <div>
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Ejecutivos</CardTitle>
                            <CardDescription>Administra la lista de ejecutivos en tu equipo.</CardDescription>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button size="sm"><PlusCircle className="mr-2 h-4 w-4"/>Agregar Ejecutivo</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Nuevo Ejecutivo</DialogTitle>
                                </DialogHeader>
                                {/* Form will go here */}
                                <p>Formulario para agregar ejecutivo.</p>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre del Ejecutivo</TableHead>
                                <TableHead className="w-[100px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockExecutives.map(exec => (
                                <TableRow key={exec.id}>
                                    <TableCell className="font-medium">{exec.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
