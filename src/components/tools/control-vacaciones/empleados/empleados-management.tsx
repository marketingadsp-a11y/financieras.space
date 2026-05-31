"use client";
 
import * as React from "react";
import { PlusCircle, Loader2, Users, Search, Award, Calendar, Cake } from "lucide-react";
import { differenceInYears } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { EmpleadosTable } from "./empleados-table";
import { EmpleadoForm, type EmpleadoFormValues } from "./empleado-form";
import { getEmpleados, addEmpleado, updateEmpleado, deleteEmpleado, getVacationRules } from "@/services/vacaciones-service";
import type { EmpleadoVacaciones, VacationRule } from "@/lib/data";
 
export function EmpleadosManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [empleados, setEmpleados] = React.useState<EmpleadoVacaciones[]>([]);
  const [rules, setRules] = React.useState<VacationRule[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingEmpleado, setEditingEmpleado] = React.useState<EmpleadoVacaciones | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredEmpleados = React.useMemo(() => {
    if (!searchQuery.trim()) return empleados;
    const query = searchQuery.toLowerCase();
    return empleados.filter(emp => emp.name.toLowerCase().includes(query));
  }, [empleados, searchQuery]);

  const metrics = React.useMemo(() => {
    let totalColaboradores = empleados.length;
    let eligibleCount = 0;
    let totalDisponibleDays = 0;
    let totalTomadosDays = 0;
    const currentMonth = new Date().getMonth();
    let bdaysThisMonth = 0;

    empleados.forEach(emp => {
      if (emp.birthday) {
        const bday = new Date(emp.birthday);
        if (bday.getMonth() === currentMonth) {
          bdaysThisMonth++;
        }
      }

      const yearsOfService = differenceInYears(new Date(), new Date(emp.fechaIngreso));
      if (yearsOfService >= 1) {
        eligibleCount++;
        const applicableRule = rules
          .filter(r => r.year <= yearsOfService)
          .sort((a, b) => b.year - a.year)[0];
        const disp = applicableRule ? applicableRule.days : 0;
        totalDisponibleDays += disp;
        totalTomadosDays += emp.diasTomados || 0;
      }
    });

    const totalRemainingDays = totalDisponibleDays - totalTomadosDays;

    return {
      totalColaboradores,
      eligibleCount,
      totalRemainingDays,
      totalTomadosDays,
      bdaysThisMonth
    };
  }, [empleados, rules]);
 
  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [data, rulesData] = await Promise.all([
        getEmpleados(user.prefix),
        getVacationRules(user.prefix),
      ]);
      setEmpleados(data);
      setRules(rulesData);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, toast]);
 
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
 
  const handleFormSubmit = async (formData: EmpleadoFormValues) => {
    if (!user?.prefix) return;
 
    try {
      if (editingEmpleado) {
        await updateEmpleado(editingEmpleado.id, { ...formData });
        toast({ title: "Éxito", description: "Empleado actualizado." });
      } else {
        await addEmpleado({ ...formData, prefix: user.prefix });
        toast({ title: "Éxito", description: "Empleado registrado." });
      }
      setIsFormOpen(false);
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el empleado." });
    }
  };
 
  const handleDelete = async (id: string) => {
    try {
      await deleteEmpleado(id);
      toast({ title: "Éxito", description: "Empleado eliminado." });
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el empleado." });
    }
  };
  
  const handleEdit = (empleado: EmpleadoVacaciones) => {
    setEditingEmpleado(empleado);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingEmpleado(null);
    setIsFormOpen(true);
  }
 
  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingEmpleado(null);
    }
  };
 
  return (
    <Card className="premium-card hover:translate-y-0 hover:scale-100 border border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
      <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Users className="h-5 w-5 text-primary" />
              Gestión de Empleados
            </CardTitle>
            <CardDescription className="text-xs mt-1">Crea, edita y elimina los colaboradores para el control de vacaciones.</CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
               <Button size="sm" onClick={handleAddNew} className="bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                <PlusCircle className="mr-2 h-4 w-4" />
                Registrar Empleado
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg max-w-md">
              <DialogHeader className="border-b pb-3 mb-2">
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {editingEmpleado ? 'Editar' : 'Registrar'} Empleado
                </DialogTitle>
              </DialogHeader>
              <EmpleadoForm
                onSubmit={handleFormSubmit}
                empleado={editingEmpleado}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {/* Metrics Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="border border-slate-100 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm p-4 rounded-2xl flex flex-col justify-between group hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Empleados</span>
                  <h4 className="text-2xl font-black mt-1 text-slate-800 dark:text-slate-100">{metrics.totalColaboradores}</h4>
                </div>
                <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Colaboradores registrados</p>
            </div>

            <div className="border border-slate-100 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm p-4 rounded-2xl flex flex-col justify-between group hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Elegibles Vacaciones</span>
                  <h4 className="text-2xl font-black mt-1 text-slate-800 dark:text-slate-100">{metrics.eligibleCount}</h4>
                </div>
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Award className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Con antigüedad ≥ 1 año</p>
            </div>

            <div className="border border-slate-100 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm p-4 rounded-2xl flex flex-col justify-between group hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Cumpleaños del Mes</span>
                  <h4 className="text-2xl font-black mt-1 text-slate-800 dark:text-slate-100">{metrics.bdaysThisMonth}</h4>
                </div>
                <div className="p-2 bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-xl">
                  <Cake className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Celebraciones en este mes</p>
            </div>
          </div>
        )}

        {!isLoading && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar empleado por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/30 focus-visible:ring-primary/20 focus-visible:border-primary/60 transition-all"
            />
          </div>
        )}
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-40 gap-2">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground font-medium">Cargando lista de colaboradores...</span>
          </div>
        ) : (
          <EmpleadosTable data={filteredEmpleados} rules={rules} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </CardContent>
    </Card>
  );
}
