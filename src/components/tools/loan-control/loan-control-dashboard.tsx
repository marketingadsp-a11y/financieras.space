
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import type { Plaza } from "@/lib/data";
import { getPlazas } from "@/services/plaza-service";
import { Loader2, Building, ArrowRight, Upload, ClipboardPaste } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { parseFullLoanData } from "@/ai/flows/full-loan-data-parser-flow";
import { importFullLoanData } from "@/services/loan-control-service";


const PlazaCard = ({ plaza }: { plaza: Plaza }) => (
    <Card className="flex flex-col group hover:border-primary transition-all">
        <CardHeader>
            <div className="flex items-center gap-4">
                 <div className="p-3 bg-primary/10 rounded-lg w-fit">
                    <Building className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div>
                    <CardTitle>{plaza.name}</CardTitle>
                    <CardDescription>Prefijo: {plaza.prefix}</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground">Gestiona carteras, grupos y asigna clientes a esta plaza.</p>
        </CardContent>
        <CardFooter>
            <Button asChild className="w-full">
                <Link href={`/tools/loan-control/plaza/${plaza.id}`}>
                    Administrar Plaza
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </CardFooter>
    </Card>
);

export function LoanControlDashboard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [plazas, setPlazas] = React.useState<Plaza[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isImportModalOpen, setImportModalOpen] = React.useState(false);
    const [importText, setImportText] = React.useState('');
    const [importMode, setImportMode] = React.useState<'add' | 'replace'>('add');
    const [isParsing, setIsParsing] = React.useState(false);


    const fetchPlazasForUser = React.useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const shouldFetchAll = user.isSuperAdmin || user.isToolAdmin;
            const plazasFromDb = await getPlazas({ prefix: user.prefix, fetchAll: shouldFetchAll });
            setPlazas(plazasFromDb);
        } catch (error) {
            console.error("Failed to fetch plazas", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las plazas.' });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    React.useEffect(() => {
        fetchPlazasForUser();
    }, [fetchPlazasForUser]);
    
    const handleImport = async () => {
        if (!importText.trim()) {
            toast({ variant: "destructive", title: "Error", description: "El área de texto no puede estar vacía." });
            return;
        }
        if (!user?.prefix) {
            toast({ variant: "destructive", title: "Error", description: "No tienes un prefijo asignado para importar datos." });
            return;
        }
        setIsParsing(true);
        try {
            const parsedData = await parseFullLoanData({ inputText: importText });
            if (!parsedData || parsedData.length === 0) {
                toast({ variant: "destructive", title: "Error de IA", description: "La IA no pudo procesar el texto. Verifica el formato." });
                setIsParsing(false);
                return;
            }

            await importFullLoanData(parsedData, importMode, user.prefix);

            toast({ title: "Éxito", description: `Se procesaron ${parsedData.length} plaza(s) y sus datos.` });
            await fetchPlazasForUser();
            setImportModalOpen(false);
            setImportText('');

        } catch (error) {
            toast({ variant: "destructive", title: "Error de Importación", description: "Ocurrió un error al importar los datos." });
            console.error(error);
        } finally {
            setIsParsing(false);
        }
    };


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Cargando plazas...</span>
            </div>
        );
    }
  
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Control de Préstamo</h1>
                    <p className="text-muted-foreground">
                        Selecciona una plaza para organizar clientes en carteras y grupos.
                    </p>
                </div>
                 <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Upload className="mr-2 h-4 w-4" /> Importar Todo
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Importación Masiva (Plaza {'>'} Cartera {'>'} Grupo {'>'} Cliente)</DialogTitle>
                            <DialogDescriptionComponent>
                              Pega texto de una hoja de cálculo. La IA identificará Plazas, Carteras, Grupos y Clientes para una importación completa.
                              Asegúrate de que las columnas PLAZA, CARTERA y GRUPO estén bien definidas.
                            </DialogDescriptionComponent>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                              <Label>Modo de Importación</Label>
                              <RadioGroup defaultValue="add" value={importMode} onValueChange={(value) => setImportMode(value as any)} className="flex items-center gap-6">
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="add" id="r1" />
                                  <Label htmlFor="r1">Añadir a existentes</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="replace" id="r2" />
                                  <Label htmlFor="r2">Reemplazar todos los datos de este prefijo</Label>
                                </div>
                              </RadioGroup>
                            </div>
                            <Textarea 
                              placeholder="Pega aquí los datos de tu hoja de cálculo..." 
                              className="min-h-[200px]"
                              value={importText}
                              onChange={(e) => setImportText(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setImportModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleImport} disabled={isParsing}>
                                {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardPaste className="mr-2 h-4 w-4"/>}
                                {isParsing ? 'Procesando...' : 'Importar desde Texto'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                  </Dialog>
            </div>

            {plazas.length > 0 ? (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {plazas.map(plaza => (
                        <PlazaCard key={plaza.id} plaza={plaza} />
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">No hay plazas disponibles. Un administrador debe crear una primero o puedes importarlas masivamente.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
