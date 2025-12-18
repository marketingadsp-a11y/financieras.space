
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

// TODO: Replace with actual service calls
const getCompensationsConfig = async (prefix: string) => ({
    baseSalary: 4000,
    bonuses: [
        { id: 'b1', name: 'Fallo menor al 2%', percentage: 50 },
        { id: 'b2', name: 'Recopilador', percentage: 15 },
        { id: 'b3', name: 'Ubicación', percentage: 15 },
        { id: 'b4', name: 'Reporte del Sábado', percentage: 20 },
    ],
    executives: [
        { id: '1', name: 'JUAN PEREZ' },
        { id: '2', name: 'MARIA GARCIA' },
    ]
});
const saveCompensationsConfig = async (prefix: string, config: any) => { console.log("Saving:", config); return Promise.resolve(); }


export function CompensationsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const [baseSalary, setBaseSalary] = React.useState(0);
  const [bonuses, setBonuses] = React.useState<{id: string, name: string, percentage: number}[]>([]);
  const [executives, setExecutives] = React.useState<{id: string, name: string}[]>([]);

  // Dialog State
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'new_bonus' | 'edit_bonus' | 'new_exec' | 'edit_exec'>('new_bonus');
  const [editingItem, setEditingItem] = React.useState<any>(null);
  
  // Alert Dialog State
  const [alertOpen, setAlertOpen] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<{type: 'bonus' | 'executive', id: string, name: string} | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!user?.prefix) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const config = await getCompensationsConfig(user.prefix);
        setBaseSalary(config.baseSalary);
        setBonuses(config.bonuses);
        setExecutives(config.executives);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos de compensación." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user?.prefix, toast]);

  const handleSaveBaseSalary = async () => {
    if (!user?.prefix) return;
    setIsSaving(true);
    try {
      await saveCompensationsConfig(user.prefix, { baseSalary });
      toast({ title: "Éxito", description: "Nómina base actualizada." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la nómina base." });
    } finally {
      setIsSaving(false);
    }
  };
  
  const openDialog = (mode: typeof dialogMode, item: any | null = null) => {
    setDialogMode(mode);
    setEditingItem(item);
    setDialogOpen(true);
  }

  const openDeleteAlert = (type: 'bonus' | 'executive', item: {id: string, name: string}) => {
    setItemToDelete({ type, ...item });
    setAlertOpen(true);
  }
  
  const handleItemDelete = async () => {
    if (!itemToDelete || !user?.prefix) return;
    
    let newBonuses = [...bonuses];
    let newExecutives = [...executives];
    
    if (itemToDelete.type === 'bonus') {
        newBonuses = bonuses.filter(b => b.id !== itemToDelete.id);
    } else {
        newExecutives = executives.filter(e => e.id !== itemToDelete.id);
    }
    
    try {
        await saveCompensationsConfig(user.prefix, { bonuses: newBonuses, executives: newExecutives });
        setBonuses(newBonuses);
        setExecutives(newExecutives);
        toast({ title: "Éxito", description: `${itemToDelete.type === 'bonus' ? 'Bono' : 'Ejecutivo'} eliminado.` });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el elemento." });
    } finally {
        setAlertOpen(false);
        setItemToDelete(null);
    }
  }


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
                                value={baseSalary}
                                onValueChange={(value) => setBaseSalary(value || 0)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveBaseSalary} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Guardar Nómina Base
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Bonos de Rendimiento</CardTitle>
                            <CardDescription>Crea y gestiona los bonos disponibles.</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => openDialog('new_bonus')}><PlusCircle className="mr-2 h-4 w-4"/>Agregar Bono</Button>
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
                            {bonuses.map(bono => (
                                <TableRow key={bono.id}>
                                    <TableCell className="font-medium">{bono.name}</TableCell>
                                    <TableCell className="text-right font-mono">{bono.percentage}%</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('edit_bonus', bono)}><Edit className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDeleteAlert('bonus', bono)}><Trash2 className="h-4 w-4"/></Button>
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
                        <Button size="sm" onClick={() => openDialog('new_exec')}><PlusCircle className="mr-2 h-4 w-4"/>Agregar Ejecutivo</Button>
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
                            {executives.map(exec => (
                                <TableRow key={exec.id}>
                                    <TableCell className="font-medium">{exec.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('edit_exec', exec)}><Edit className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDeleteAlert('executive', exec)}><Trash2 className="h-4 w-4"/></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        
        {/* Universal Dialog for Forms */}
         <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{dialogMode.includes('new') ? 'Agregar' : 'Editar'} {dialogMode.includes('bonus') ? 'Bono' : 'Ejecutivo'}</DialogTitle>
                </DialogHeader>
                 {/* TODO: Add a generic form component here */}
                <p className="py-4">Contenido del formulario para {dialogMode}...</p>
            </DialogContent>
        </Dialog>
        
        {/* Universal Alert for Deletion */}
        <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción es irreversible. Se eliminará a <strong>{itemToDelete?.name}</strong> de la lista.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleItemDelete}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
