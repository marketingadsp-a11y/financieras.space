
"use client";

import * as React from "react";
import { assignCustomersToGrupo, getAssignedCustomersByGrupo, getGrupoById, getUnassignedCustomersByPlaza, unassignCustomerFromGrupo } from "@/services/loan-control-service";
import type { Customer, LoanControlGrupo } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const CustomerList = ({ title, customers, selected, onSelectionChange }: {
    title: string;
    customers: Customer[];
    selected: Set<string>;
    onSelectionChange: (id: string) => void;
}) => (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{customers.length} cliente(s)</CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-96 pr-4">
                <div className="space-y-2">
                    {customers.length > 0 ? customers.map(c => (
                        <div 
                            key={c.id} 
                            className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50 transition-colors"
                        >
                            <Checkbox
                                id={c.id}
                                checked={selected.has(c.id)}
                                onCheckedChange={() => onSelectionChange(c.id)}
                            />
                            <label htmlFor={c.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer">
                                <p>{c.name}</p>
                                <p className="text-xs text-muted-foreground">{c.address}</p>
                            </label>
                        </div>
                    )) : <p className="text-sm text-muted-foreground text-center pt-10">No hay clientes aquí.</p>}
                </div>
            </ScrollArea>
        </CardContent>
    </Card>
);

export function GrupoDetail({ grupoId }: { grupoId: string }) {
    const { toast } = useToast();
    const [grupo, setGrupo] = React.useState<LoanControlGrupo | null>(null);
    const [unassigned, setUnassigned] = React.useState<Customer[]>([]);
    const [assigned, setAssigned] = React.useState<Customer[]>([]);
    const [selectedUnassigned, setSelectedUnassigned] = React.useState(new Set<string>());
    const [selectedAssigned, setSelectedAssigned] = React.useState(new Set<string>());
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const grupoData = await getGrupoById(grupoId);
            setGrupo(grupoData);
            if (grupoData) {
                const [unassignedData, assignedData] = await Promise.all([
                    getUnassignedCustomersByPlaza(grupoData.plazaId),
                    getAssignedCustomersByGrupo(grupoData.id)
                ]);
                setUnassigned(unassignedData);
                setAssigned(assignedData);
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información del grupo." });
        } finally {
            setIsLoading(false);
        }
    }, [grupoId, toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSelection = (listType: 'assigned' | 'unassigned', customerId: string) => {
        if (listType === 'unassigned') {
            setSelectedUnassigned(prev => {
                const newSet = new Set(prev);
                if (newSet.has(customerId)) newSet.delete(customerId);
                else newSet.add(customerId);
                return newSet;
            });
        } else {
            setSelectedAssigned(prev => {
                const newSet = new Set(prev);
                if (newSet.has(customerId)) newSet.delete(customerId);
                else newSet.add(customerId);
                return newSet;
            });
        }
    };
    
    const handleAssign = async () => {
        if (selectedUnassigned.size === 0) return;
        setIsSubmitting(true);
        try {
            await assignCustomersToGrupo(Array.from(selectedUnassigned), grupoId);
            toast({ title: "Éxito", description: `${selectedUnassigned.size} cliente(s) asignado(s).` });
            setSelectedUnassigned(new Set());
            fetchData();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudieron asignar los clientes." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleUnassign = async () => {
        if (selectedAssigned.size === 0) return;
        setIsSubmitting(true);
        try {
            await Promise.all(Array.from(selectedAssigned).map(id => unassignCustomerFromGrupo(id)));
            toast({ title: "Éxito", description: `${selectedAssigned.size} cliente(s) desasignado(s).` });
            setSelectedAssigned(new Set());
            fetchData();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudieron desasignar los clientes." });
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Cargando clientes...</span>
            </div>
        );
    }

    if (!grupo) {
        return <p>Grupo no encontrado.</p>
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Grupo: {grupo.name}</h1>
            <p className="text-muted-foreground">
                Asigna o remueve clientes de este grupo. Los clientes deben existir en la plaza principal.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                <CustomerList 
                    title="Clientes Sin Grupo (En Plaza)" 
                    customers={unassigned}
                    selected={selectedUnassigned}
                    onSelectionChange={(id) => handleSelection('unassigned', id)}
                />

                <div className="flex flex-col gap-4">
                    <Button onClick={handleAssign} disabled={isSubmitting || selectedUnassigned.size === 0}>
                        <span className="hidden lg:inline">Asignar</span>
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                     <Button onClick={handleUnassign} disabled={isSubmitting || selectedAssigned.size === 0} variant="outline">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden lg:inline">Desasignar</span>
                    </Button>
                </div>
                
                <CustomerList 
                    title={`Clientes en ${grupo.name}`} 
                    customers={assigned}
                    selected={selectedAssigned}
                    onSelectionChange={(id) => handleSelection('assigned', id)}
                />
            </div>
        </div>
    );
}
