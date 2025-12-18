
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
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, User, Percent, DollarSign, Edit, Trash2, Trophy } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { BonusForm, type BonusFormValues } from "./bonus-form";
import { ExecutiveForm, type ExecutiveFormValues } from "./executive-form";

// Mock data types - replace with actual types from your data library
type Executive = { id: string; name: string; plaza: string; fechaIngreso: Date };
type Bonus = { id: string; name: string; percentage: number };
type CompensationConfig = {
    baseSalary: number;
    baseBonus: number;
    bonuses: Bonus[];
    executives: Executive[];
}

// TODO: Replace with actual service calls
const getCompensationsConfig = async (prefix: string): Promise<CompensationConfig> => ({
    baseSalary: 4000,
    baseBonus: 3000,
    bonuses: [
        { id: 'b1', name: 'Fallo menor al 2%', percentage: 50 },
        { id: 'b2', name: 'Recopilador', percentage: 15 },
        { id: 'b3', name: 'Ubicación', percentage: 15 },
        { id: 'b4', name: 'Reporte del Sábado', percentage: 20 },
    ],
    executives: [
        { id: '1', name: 'JUAN PEREZ', plaza: 'Plaza A', fechaIngreso: new Date() },
        { id: '2', name: 'MARIA GARCIA', plaza: 'Plaza B', fechaIngreso: new Date() },
    ]
});
const saveCompensationsConfig = async (prefix: string, config: Partial<CompensationConfig>) => { console.log("Saving:", config); return Promise.resolve(); }


export function CompensationsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const [baseSalary, setBaseSalary] = React.useState(0);
  const [baseBonus, setBaseBonus] = React.useState(0);
  const [bonuses, setBonuses] = React.useState<Bonus[]>([]);
  const [executives, setExecutives] = React.useState<Executive[]>([]);

  // Dialog State
  const [bonusFormOpen, setBonusFormOpen] = React.useState(false);
  const [executiveFormOpen, setExecutiveFormOpen] = React.useState(false);
  const [editingBonus, setEditingBonus] = React.useState<Bonus | null>(null);
  const [editingExecutive, setEditingExecutive] = React.useState<Executive | null>(null);
  
  // Alert Dialog State
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
        setBaseBonus(config.baseBonus);
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

  const handleSaveConfigValue = async (field: 'baseSalary' | 'baseBonus', value: number) => {
    if (!user?.prefix) return;
    setIsSaving(true);
    try {
      await saveCompensationsConfig(user.prefix, { [field]: value });
      toast({ title: "Éxito", description: `${field === 'baseSalary' ? 'Nómina base' : 'Bono base'} actualizado.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: `No se pudo guardar ${field === 'baseSalary' ? 'la nómina base' : 'el bono base'}.` });
    } finally {
      setIsSaving(false);
    }
  };
  
  const openBonusForm = (bonus: Bonus | null = null) => {
    setEditingBonus(bonus);
    setBonusFormOpen(true);
  }
  
  const openExecutiveForm = (executive: Executive | null = null) => {
    setEditingExecutive(executive);
    setExecutiveFormOpen(true);
  }
  
  const handleBonusSubmit = async (values: BonusFormValues) => {
      // Mock logic - replace with service call
      if (editingBonus) {
        setBonuses(bonuses.map(b => b.id === editingBonus.id ? { ...b, ...values } : b));
      } else {
        setBonuses([...bonuses, { ...values, id: `b${Date.now()}` }]);
      }
      toast({ title: "Éxito", description: `Bono ${editingBonus ? 'actualizado' : 'creado'}.` });
      setBonusFormOpen(false);
  }

  const handleExecutiveSubmit = async (values: ExecutiveFormValues) => {
      // Mock logic - replace with service call
      if (editingExecutive) {
        setExecutives(executives.map(e => e.id === editingExecutive.id ? { ...e, ...values } : e));
      } else {
        setExecutives([...executives, { ...values, id: `e${Date.now()}` }]);
      }
       toast({ title: "Éxito", description: `Ejecutivo ${editingExecutive ? 'actualizado' : 'creado'}.` });
      setExecutiveFormOpen(false);
  }

  const openDeleteAlert = (type: 'bonus' | 'executive', item: {id: string, name: string}) => {
    setItemToDelete({ type, ...item });
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
    <div className="space-y-6">
       <div className="grid gap-6 lg:grid-cols-2">
           <Card>
                <CardHeader>
                    <CardTitle>Nómina Base</CardTitle>
                    <CardDescription>Define el sueldo base semanal para todos los ejecutivos.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="space-y-2">
                        <Label htmlFor="base-salary">Monto de la Nómina Base</Label>
                        <CurrencyInput
                            id="base-salary"
                            value={baseSalary}
                            onValueChange={(value) => setBaseSalary(value || 0)}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => handleSaveConfigValue('baseSalary', baseSalary)} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Guardar Nómina Base
                    </Button>
                </CardFooter>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Bono Base (100%)</CardTitle>
                    <CardDescription>Monto máximo alcanzable con la suma de todos los bonos.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="space-y-2">
                        <Label htmlFor="base-bonus">Monto del Bono Base</Label>
                        <CurrencyInput
                            id="base-bonus"
                            value={baseBonus}
                            onValueChange={(value) => setBaseBonus(value || 0)}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => handleSaveConfigValue('baseBonus', baseBonus)} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Guardar Bono Base
                    </Button>
                </CardFooter>
            </Card>
       </div>

        <div className="grid gap-6 lg:grid-cols-2">
             <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Bonos de Rendimiento</CardTitle>
                            <CardDescription>Crea y gestiona los bonos disponibles.</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => openBonusForm()}><PlusCircle className="mr-2 h-4 w-4"/>Agregar Bono</Button>
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
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openBonusForm(bono)}><Edit className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDeleteAlert('bonus', bono)}><Trash2 className="h-4 w-4"/></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Ejecutivos</CardTitle>
                            <CardDescription>Administra la lista de ejecutivos en tu equipo.</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => openExecutiveForm()}><PlusCircle className="mr-2 h-4 w-4"/>Agregar Ejecutivo</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre del Ejecutivo</TableHead>
                                <TableHead>Plaza</TableHead>
                                <TableHead className="w-[100px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {executives.map(exec => (
                                <TableRow key={exec.id}>
                                    <TableCell className="font-medium">{exec.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{exec.plaza}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openExecutiveForm(exec)}><Edit className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDeleteAlert('executive', exec)}><Trash2 className="h-4 w-4"/></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        
         <Dialog open={bonusFormOpen} onOpenChange={(open) => { setBonusFormOpen(open); if(!open) setEditingBonus(null);}}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingBonus ? 'Editar' : 'Agregar'} Bono</DialogTitle>
                </DialogHeader>
                <BonusForm onSubmit={handleBonusSubmit} bonus={editingBonus} />
            </DialogContent>
        </Dialog>

        <Dialog open={executiveFormOpen} onOpenChange={(open) => { setExecutiveFormOpen(open); if(!open) setEditingExecutive(null);}}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingExecutive ? 'Editar' : 'Agregar'} Ejecutivo</DialogTitle>
                </DialogHeader>
                <ExecutiveForm onSubmit={handleExecutiveSubmit} executive={editingExecutive} />
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción es irreversible. Se eliminará a <strong>{itemToDelete?.name}</strong> de la lista.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleItemDelete}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
