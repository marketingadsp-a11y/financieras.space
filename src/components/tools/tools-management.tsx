
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription as AlertDialogDescriptionComponent,
} from "@/components/ui/alert-dialog"

import { getAdmins, updateAdmin } from "@/services/admin-service";
import { getPlazas } from "@/services/plaza-service";
import { getAllCompanyProfiles } from "@/services/company-profile-service";
import { addMultipleDailyRecords, deleteDailyRecordsByPlaza } from "@/services/daily-record-service";
import { parseDailyRecords } from "@/ai/flows/daily-record-parser-flow";
import type { Admin, Tool, Plaza, DailyRecordEntry, CompanyProfile } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Wrench, CheckCircle2, ClipboardPaste, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { getCustomizedTools } from "@/lib/data";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


// Reusable Dialog for Daily Record Import
const DailyRecordImportDialog = ({
    isOpen,
    onClose,
    onSuccess,
    plazas
}: {
    isOpen: boolean,
    onClose: () => void,
    onSuccess: () => void,
    plazas: Plaza[]
}) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [importText, setImportText] = React.useState('');
    const [isParsing, setIsParsing] = React.useState(false);
    const [importPlazaId, setImportPlazaId] = React.useState<string>(plazas[0]?.id || '');
    const [importMode, setImportMode] = React.useState<'add' | 'replace'>('add');

    React.useEffect(() => {
        if (plazas.length > 0 && !importPlazaId) {
            setImportPlazaId(plazas[0].id);
        }
    }, [plazas, importPlazaId]);


    const handleImport = async () => {
        if (!importText.trim()) {
            toast({ variant: "destructive", title: "Error", description: "El área de texto no puede estar vacía." });
            return;
        }
        if (!importPlazaId || !user?.prefix) {
            toast({ variant: "destructive", title: "Error", description: "Debes seleccionar una plaza y tener un prefijo para importar." });
            return;
        }
        setIsParsing(true);
        try {
            const parsedData = await parseDailyRecords({ inputText: importText });
            if (!parsedData || parsedData.length === 0) {
                toast({ variant: "destructive", title: "Error de IA", description: "La IA no pudo procesar el texto. Verifica el formato." });
                return;
            }

            const recordsToAdd: Omit<DailyRecordEntry, 'id'>[] = parsedData.map(p => ({
                date: new Date(p.date), // Assumes YYYY-MM-DD from AI
                type: p.type,
                amount: p.amount,
                description: p.description,
                category: p.category && p.category !== 'N/A' ? p.category : undefined,
            }));
            
            await addMultipleDailyRecords(importPlazaId, user.prefix, recordsToAdd, importMode);

            toast({ title: "Éxito", description: `${recordsToAdd.length} registros importados correctamente a la plaza seleccionada.` });
            
            onSuccess(); // Callback to parent
            onClose(); // Close the dialog
            setImportText('');

        } catch (error) {
            toast({ variant: "destructive", title: "Error de Importación", description: "Ocurrió un error al importar los registros." });
            console.error(error);
        } finally {
            setIsParsing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Importar Registros de Control Diario</DialogTitle>
                    <DialogDescription>
                        Pega texto de una hoja de cálculo. La IA intentará reconocer las columnas comunes como FECHA, TIPO, MONTO, etc., y las asignará a la plaza que elijas.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Modo de Importación</Label>
                        <RadioGroup defaultValue="add" value={importMode} onValueChange={(value) => setImportMode(value as any)} className="flex items-center gap-6">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="add" id="r-add" />
                                <Label htmlFor="r-add">Agregar a existentes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="replace" id="r-replace" />
                                <Label htmlFor="r-replace">Reemplazar en fechas importadas</Label>
                            </div>
                        </RadioGroup>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="plaza-select">Selecciona la Plaza para Importar</Label>
                        <Select value={importPlazaId} onValueChange={setImportPlazaId}>
                            <SelectTrigger id="plaza-select">
                                <SelectValue placeholder="Selecciona una plaza" />
                            </SelectTrigger>
                            <SelectContent>
                                {plazas.map(plaza => (
                                    <SelectItem key={plaza.id} value={plaza.id}>{plaza.name} ({plaza.prefix})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Textarea 
                        placeholder="Pega aquí los datos de tu hoja de cálculo..." 
                        className="min-h-[200px]"
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleImport} disabled={isParsing || !importPlazaId}>
                        {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardPaste className="mr-2 h-4 w-4"/>}
                        {isParsing ? 'Procesando...' : 'Importar Registros'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Reusable Dialog for Daily Record Deletion
const DailyRecordDeleteDialog = ({
    isOpen,
    onClose,
    onSuccess,
    plazas
}: {
    isOpen: boolean,
    onClose: () => void,
    onSuccess: () => void,
    plazas: Plaza[]
}) => {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [selectedPlazaId, setSelectedPlazaId] = React.useState<string>('');
    const [confirmationText, setConfirmationText] = React.useState('');

    const expectedConfirmationText = "ELIMINAR DATOS";

    const handleDelete = async () => {
        if (!selectedPlazaId) {
            toast({ variant: "destructive", title: "Error", description: "Debes seleccionar una plaza." });
            return;
        }
        if (confirmationText !== expectedConfirmationText) {
            toast({ variant: "destructive", title: "Error", description: "El texto de confirmación no coincide." });
            return;
        }
        
        setIsDeleting(true);
        try {
            await deleteDailyRecordsByPlaza(selectedPlazaId);
            toast({ title: "Éxito", description: `Todos los registros de control diario para la plaza seleccionada han sido eliminados.` });
            onSuccess();
            onClose();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudieron eliminar los registros." });
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleClose = () => {
        setSelectedPlazaId('');
        setConfirmationText('');
        onClose();
    }
    
    const selectedPlazaName = plazas.find(p => p.id === selectedPlazaId)?.name || '';

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                    <AlertDialogDescriptionComponent>
                        Esta acción es irreversible y eliminará permanentemente TODOS los registros de Control Diario para la plaza que selecciones.
                    </AlertDialogDescriptionComponent>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                     <div className="space-y-2">
                        <Label htmlFor="plaza-delete-select">Selecciona la Plaza a Afectar</Label>
                        <Select value={selectedPlazaId} onValueChange={setSelectedPlazaId} disabled={isDeleting}>
                            <SelectTrigger id="plaza-delete-select">
                                <SelectValue placeholder="Selecciona una plaza" />
                            </SelectTrigger>
                            <SelectContent>
                                {plazas.map(plaza => (
                                    <SelectItem key={plaza.id} value={plaza.id}>{plaza.name} ({plaza.prefix})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedPlazaId && (
                        <div className="space-y-2">
                            <Label htmlFor="delete-confirm">Para confirmar, escribe <strong className="text-foreground">{expectedConfirmationText}</strong></Label>
                             <Input
                                id="delete-confirm"
                                value={confirmationText}
                                onChange={(e) => setConfirmationText(e.target.value)}
                                placeholder={expectedConfirmationText}
                                autoComplete="off"
                                disabled={isDeleting}
                            />
                        </div>
                    )}
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleClose}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDelete}
                        disabled={isDeleting || confirmationText !== expectedConfirmationText || !selectedPlazaId}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                         {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         Sí, eliminar datos de {selectedPlazaName}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};


export function ToolsManagement({ customTools: incomingCustomTools }: { customTools?: Tool[] }) {
  const { user } = useAuth();
  const [customTools, setCustomTools] = React.useState<Tool[]>([]);

  React.useEffect(() => {
    // Effect to update tool names if they change in localStorage, or use incoming prop
    const updateTools = () => {
        if(incomingCustomTools) {
            setCustomTools(incomingCustomTools)
        } else {
            setCustomTools(getCustomizedTools());
        }
    };
    window.addEventListener('storage', updateTools);
    updateTools(); // Initial call
    return () => window.removeEventListener('storage', updateTools);
  }, [incomingCustomTools]);


  if (user && !user.isSuperAdmin) {
    return <AdminToolsView customTools={customTools} />;
  }

  return <SuperAdminToolsView customTools={customTools} />;
}

function SuperAdminToolsView({ customTools }: { customTools: Tool[] }) {
  const [admins, setAdmins] = React.useState<Admin[]>([]);
  const [allPlazas, setAllPlazas] = React.useState<Plaza[]>([]);
  const [companyProfiles, setCompanyProfiles] = React.useState<CompanyProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAccessModalOpen, setAccessModalOpen] = React.useState(false);
  const [isImportModalOpen, setImportModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedTool, setSelectedTool] = React.useState<Tool | null>(null);
  const [selectedAdmins, setSelectedAdmins] = React.useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const [adminData, plazaData, profileData] = await Promise.all([
            getAdmins(),
            getPlazas({ fetchAll: true }),
            getAllCompanyProfiles()
        ]);
        setAdmins(adminData);
        setAllPlazas(plazaData);
        setCompanyProfiles(profileData);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudieron cargar los datos iniciales.",
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleManageAccessClick = (tool: Tool) => {
    setSelectedTool(tool);
    const adminsWithAccess = new Set(
      admins
        .filter((admin) => admin.accessibleTools?.includes(tool.id))
        .map((admin) => admin.id)
    );
    setSelectedAdmins(adminsWithAccess);
    setAccessModalOpen(true);
  };

  const handleAdminSelection = (adminId: string) => {
    setSelectedAdmins((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(adminId)) {
        newSet.delete(adminId);
      } else {
        newSet.add(adminId);
      }
      return newSet;
    });
  };

  const handleSaveChanges = async () => {
    if (!selectedTool) return;
    setIsSaving(true);
    try {
      const updates = admins.map(admin => {
        const hasAccess = selectedAdmins.has(admin.id);
        const hadAccess = admin.accessibleTools?.includes(selectedTool.id);
        
        let newTools: string[];
        if (hasAccess && !hadAccess) {
            newTools = [...(admin.accessibleTools || []), selectedTool.id];
        } else if (!hasAccess && hadAccess) {
            newTools = (admin.accessibleTools || []).filter(t => t !== selectedTool.id);
        } else {
            return null; // No changes for this admin
        }
        
        return updateAdmin(admin.id, { accessibleTools: newTools });
      });
      
      await Promise.all(updates.filter(Boolean));

      // Refetch admins to update state
      const updatedAdmins = await getAdmins();
      setAdmins(updatedAdmins);

      toast({
        title: "Éxito",
        description: "Permisos actualizados correctamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar los cambios.",
      });
    } finally {
      setIsSaving(false);
      setAccessModalOpen(false);
    }
  };

  const groupedAdmins = React.useMemo(() => {
    return admins.reduce((acc, admin) => {
      const prefix = admin.prefix || 'Sin Prefijo';
      if (!acc[prefix]) {
        acc[prefix] = [];
      }
      acc[prefix].push(admin);
      return acc;
    }, {} as Record<string, Admin[]>);
  }, [admins]);
  
  const getCompanyProfile = (prefix: string) => {
      if (prefix === 'Sin Prefijo') return null;
      return companyProfiles.find(p => p.id === prefix);
  };

  const getAdminsWithAccessCount = (toolId: string) => {
    return admins.filter(admin => admin.accessibleTools?.includes(toolId)).length;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Herramientas</h1>
        <p className="text-muted-foreground">
          Asigna acceso a las herramientas disponibles para los administradores de la plataforma.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {customTools.map((tool) => (
          <div key={tool.id} className="group relative">
            <Card 
              className="h-full flex flex-col transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1.5 overflow-hidden"
            >
              <CardHeader className="cursor-pointer" onClick={() => handleManageAccessClick(tool)}>
                <div className="flex justify-between items-start">
                    <div className="p-3 rounded-lg w-fit transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: `${tool.color}1A` }}>
                        <tool.icon className="h-6 w-6" style={{ color: tool.color }} />
                    </div>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                                    <Users className="h-4 w-4" />
                                    <span>{getAdminsWithAccessCount(tool.id)}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{getAdminsWithAccessCount(tool.id)} admin(s) con acceso</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent className="flex-grow cursor-pointer" onClick={() => handleManageAccessClick(tool)}>
                <h3 className="text-lg font-semibold">{tool.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-4">
                 <Button variant="ghost" className="p-0 h-auto" onClick={() => handleManageAccessClick(tool)} style={{ color: tool.color }}>
                    <span className="text-sm font-medium flex items-center gap-2">
                        Gestionar Acceso
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                 </Button>
                {tool.id === 'daily-control' && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t w-full">
                        <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)}>
                            <ClipboardPaste className="mr-2 h-4 w-4" />
                            Importar Registros
                        </Button>
                         <Button variant="destructive" size="sm" onClick={() => setDeleteModalOpen(true)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar Registros
                        </Button>
                    </div>
                )}
              </CardFooter>
            </Card>
           </div>
        ))}
      </div>
      
      {/* Access Management Dialog */}
      <Dialog open={isAccessModalOpen} onOpenChange={setAccessModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gestionar Acceso para {selectedTool?.name}</DialogTitle>
            <DialogDescription>
              Selecciona los administradores que tendrán acceso a esta herramienta, agrupados por empresa.
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
             </div>
          ) : (
            <div className="py-4 max-h-[60vh] overflow-y-auto pr-2">
                <Accordion type="multiple" className="w-full space-y-2">
                    {Object.entries(groupedAdmins).map(([prefix, companyAdmins]) => {
                       const profile = getCompanyProfile(prefix);
                       const companyName = profile?.companyName || prefix;
                       const borderColor = profile?.loginBackgroundColor;
                       const assigned = companyAdmins.filter(admin => selectedAdmins.has(admin.id));
                       const unassigned = companyAdmins.filter(admin => !selectedAdmins.has(admin.id));

                       return (
                        <AccordionItem 
                            key={prefix} 
                            value={prefix} 
                            className="rounded-md px-2 bg-muted/20 border-2"
                            style={{ borderColor: borderColor || 'hsl(var(--border))' }}
                        >
                            <AccordionTrigger className="text-base hover:no-underline">
                                <div className="flex-1 text-left">
                                    <p className="font-semibold">{companyName}</p>
                                    <p className="text-xs text-muted-foreground">{assigned.length} de {companyAdmins.length} admins con acceso.</p>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-2 space-y-4">
                                {assigned.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Asignados ({assigned.length})</h4>
                                        <div className="space-y-2">
                                            {assigned.map((admin) => (
                                                <div key={admin.id} onClick={() => handleAdminSelection(admin.id)} className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-all duration-200 relative bg-primary/10 border-primary/50 shadow-sm">
                                                    <Avatar className="h-9 w-9"><AvatarFallback>{admin.name.charAt(0)}</AvatarFallback></Avatar>
                                                    <div className="flex-1"><p className="font-semibold">{admin.name}</p><p className="text-xs text-muted-foreground">{admin.prefix}.{admin.username}</p></div>
                                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {unassigned.length > 0 && assigned.length > 0 && <Separator />}
                                {unassigned.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Por Asignar ({unassigned.length})</h4>
                                        <div className="space-y-2">
                                            {unassigned.map((admin) => (
                                                <div key={admin.id} onClick={() => handleAdminSelection(admin.id)} className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-all duration-200 relative hover:bg-muted/50">
                                                    <Avatar className="h-9 w-9"><AvatarFallback>{admin.name.charAt(0)}</AvatarFallback></Avatar>
                                                    <div className="flex-1"><p className="font-semibold">{admin.name}</p><p className="text-xs text-muted-foreground">{admin.prefix}.{admin.username}</p></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                        )
                    })}
                </Accordion>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccessModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Daily Record Import Dialog */}
      <DailyRecordImportDialog 
        isOpen={isImportModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={fetchData}
        plazas={allPlazas}
      />

       {/* Daily Record Delete Dialog */}
      <DailyRecordDeleteDialog 
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onSuccess={fetchData}
        plazas={allPlazas}
      />
    </div>
  );
}

function AdminToolsView({ customTools }: { customTools: Tool[] }) {
    const { user } = useAuth();
    const accessibleUserTools = customTools.filter(tool => user?.accessibleTools?.includes(tool.id));
    
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Bienvenido, {user?.name || user?.username}</h1>
                <p className="text-muted-foreground">Aquí están las herramientas disponibles para ti. ¡Comencemos!</p>
            </div>

            {accessibleUserTools.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {accessibleUserTools.map((tool) => (
                        <Link href={tool.href} key={tool.id} className="group">
                            <Card className="h-full flex flex-col transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1.5 hover:border-primary/50">
                                <CardHeader>
                                    <div className="p-3 rounded-lg w-fit transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: `${tool.color}1A`}}>
                                        <tool.icon className="h-6 w-6" style={{ color: tool.color }} />
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <h3 className="text-lg font-semibold">{tool.name}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                                </CardContent>
                                <CardFooter>
                                    <span className="text-sm font-medium flex items-center gap-2" style={{ color: tool.color }}>
                                        Abrir herramienta
                                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                    </span>
                                </CardFooter>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground py-10">
                            <Wrench className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-lg font-medium">No tienes herramientas asignadas</h3>
                            <p className="mt-1 text-sm">Contacta a un super administrador para que te de acceso a las herramientas que necesites.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
