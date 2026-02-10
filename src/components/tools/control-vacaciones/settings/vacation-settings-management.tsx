"use client";

import * as React from "react";
import { PlusCircle, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getVacationRules, addVacationRule, updateVacationRule, deleteVacationRule } from "@/services/vacaciones-service";
import type { VacationRule } from "@/lib/data";
import { VacationRulesTable } from "./vacation-rules-table";
import { VacationRuleForm, type VacationRuleFormValues } from "./vacation-rule-form";


export function VacationSettingsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = React.useState<VacationRule[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<VacationRule | null>(null);

  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getVacationRules(user.prefix);
      setRules(data);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las reglas de vacaciones." });
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleFormSubmit = async (formData: VacationRuleFormValues) => {
    if (!user?.prefix) return;

    try {
      if (editingRule) {
        await updateVacationRule(editingRule.id, { ...formData });
        toast({ title: "Éxito", description: "Regla actualizada." });
      } else {
        await addVacationRule({ ...formData, prefix: user.prefix });
        toast({ title: "Éxito", description: "Regla registrada." });
      }
      setIsFormOpen(false);
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la regla." });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVacationRule(id);
      toast({ title: "Éxito", description: "Regla eliminada." });
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la regla." });
    }
  };
  
  const handleEdit = (rule: VacationRule) => {
    setEditingRule(rule);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingRule(null);
    setIsFormOpen(true);
  }

  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingRule(null);
    }
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Ajustes de Vacaciones</CardTitle>
            <CardDescription>Define los días de vacaciones correspondientes por año de antigüedad.</CardDescription>
          </div>
           <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
               <Button size="sm" onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Regla
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRule ? 'Editar' : 'Agregar'} Regla de Vacaciones</DialogTitle>
              </DialogHeader>
              <VacationRuleForm
                onSubmit={handleFormSubmit}
                rule={editingRule}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
         {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            <span>Cargando reglas...</span>
          </div>
        ) : (
          <VacationRulesTable data={rules} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </CardContent>
    </Card>
  );
}
