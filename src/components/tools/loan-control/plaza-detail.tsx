"use client";

import * as React from "react";
import Link from "next/link";
import type { LoanControlCartera, Plaza } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { invalidateClientCache } from "@/lib/client-cache";
import {
  addCartera,
  deleteCartera,
  updateCartera,
  getLoanControlPlazaDetailData,
} from "@/services/loan-control-service";
import {
  PlusCircle,
  Edit,
  Trash2,
  ArrowRight,
  Briefcase,
  FileSpreadsheet,
  FileText,
  Search,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { NavPanel } from "./nav-panel";
import { CarteraForm } from "./cartera-form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  LoanControlBreadcrumbs,
  PortfolioSummaryBar,
  ViewModeToggle,
  SortableHeaderCell,
  LoanControlSkeleton,
  formatCurrency,
  collatorES,
  type ViewMode,
  type SortDirection,
} from "./loan-control-ui";

type CarteraWithStats = LoanControlCartera & {
  grupoCount: number;
  totalLoaned: number;
  totalDue: number;
};

type CarteraSortKey = "name" | "grupos" | "loaned" | "due";

export function PlazaDetail({ plazaId }: { plazaId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plaza, setPlaza] = React.useState<Plaza | null>(null);
  const [carteras, setCarteras] = React.useState<CarteraWithStats[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isFormOpen, setFormOpen] = React.useState(false);
  const [editingCartera, setEditingCartera] = React.useState<LoanControlCartera | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = React.useState("");
  const [carteraToDelete, setCarteraToDelete] = React.useState<LoanControlCartera | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [viewMode, setViewMode] = React.useState<ViewMode>("cards");
  const [sortKey, setSortKey] = React.useState<CarteraSortKey>("name");
  const [sortDir, setSortDir] = React.useState<SortDirection>("asc");

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { plaza: plazaData, carteras: carterasData } = await getLoanControlPlazaDetailData(plazaId);
      if (plazaData) {
        setPlaza(plazaData);
        setCarteras(carterasData);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se encontró la plaza especificada.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la información de la plaza.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [plazaId, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredCarteras = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const list = query
      ? carteras.filter((c) => c.name.toLowerCase().includes(query))
      : carteras;
    const factor = sortDir === "asc" ? 1 : -1;

    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "grupos":
          return factor * (a.grupoCount - b.grupoCount);
        case "loaned":
          return factor * ((a.totalLoaned || 0) - (b.totalLoaned || 0));
        case "due":
          return factor * ((a.totalDue || 0) - (b.totalDue || 0));
        case "name":
        default:
          return factor * collatorES.compare(a.name, b.name);
      }
    });
  }, [carteras, searchTerm, sortKey, sortDir]);

  const summary = React.useMemo(() => {
    return filteredCarteras.reduce(
      (acc, c) => {
        acc.totalLoaned += c.totalLoaned || 0;
        acc.totalDue += c.totalDue || 0;
        acc.totalGroups += c.grupoCount || 0;
        return acc;
      },
      { totalLoaned: 0, totalDue: 0, totalGroups: 0 }
    );
  }, [filteredCarteras]);

  const handleFormSubmit = async (values: Omit<LoanControlCartera, "id" | "plazaId" | "prefix">) => {
    if (!user?.prefix) return;
    setIsSubmitting(true);
    try {
      if (editingCartera) {
        await updateCartera(editingCartera.id, values);
        toast({ title: "Éxito", description: "Cartera actualizada." });
      } else {
        const dataToSave = { ...values, plazaId, prefix: user.prefix };
        await addCartera(dataToSave);
        toast({ title: "Éxito", description: "Cartera creada." });
      }
      closeForm();
      invalidateClientCache("loan-control-plazas:", "loan-control-updated");
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la cartera." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCartera = async () => {
    if (!carteraToDelete) return;
    try {
      await deleteCartera(carteraToDelete.id);
      toast({ title: "Éxito", description: "Cartera eliminada." });
      setCarteraToDelete(null);
      setDeleteConfirmationText("");
      invalidateClientCache("loan-control-plazas:", "loan-control-updated");
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la cartera." });
    }
  };

  const openForm = (cartera: LoanControlCartera | null = null) => {
    setEditingCartera(cartera);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingCartera(null);
  };

  const openDeleteDialog = (cartera: LoanControlCartera) => {
    setDeleteConfirmationText("");
    setCarteraToDelete(cartera);
  };

  const closeDeleteDialog = () => {
    setCarteraToDelete(null);
    setDeleteConfirmationText("");
  };

  const handleSort = (nextKey: CarteraSortKey) => {
    if (sortKey === nextKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDir(nextKey === "name" ? "asc" : "desc");
    }
  };

  const sortPresetValue = `${sortKey}:${sortDir}`;
  const handlePresetSortChange = (val: string) => {
    const [key, dir] = val.split(":") as [CarteraSortKey, SortDirection];
    if (key && dir) {
      setSortKey(key);
      setSortDir(dir);
    }
  };

  const exportToPDF = async () => {
    if (!plaza || filteredCarteras.length === 0) return;
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF();
    const dateString = format(new Date(), "dd/MM/yyyy");
    doc.text(`Resumen de Carteras: ${plaza.name}`, 14, 16);
    doc.text(`Fecha de Exportación: ${dateString}`, 14, 22);
    autoTable(doc, {
      startY: 30,
      head: [["Cartera", "Grupos", "Total Prestado", "Total Pendiente"]],
      body: filteredCarteras.map((c) => [
        c.name,
        c.grupoCount,
        `$${c.totalLoaned.toLocaleString("es-MX")}`,
        `$${c.totalDue.toLocaleString("es-MX")}`,
      ]),
    });
    const fileName = `Resumen_Carteras_${plaza.name.replace(/\s/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
    doc.save(fileName);
  };

  const exportToExcel = async () => {
    if (!plaza || filteredCarteras.length === 0) return;
    const XLSX = await import("xlsx");
    const dataToExport = filteredCarteras.map((c) => ({
      Cartera: c.name,
      Grupos: c.grupoCount,
      "Total Prestado": c.totalLoaned,
      "Total Pendiente": c.totalDue,
    }));

    const dateString = format(new Date(), "PPP", { locale: es });
    const worksheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(worksheet, [["Resumen de Carteras"]], { origin: "A1" });
    XLSX.utils.sheet_add_aoa(worksheet, [[`Plaza: ${plaza.name}`]], { origin: "A2" });
    XLSX.utils.sheet_add_aoa(worksheet, [[`Fecha de Exportación: ${dateString}`]], { origin: "A3" });
    XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: "A5" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Carteras");
    const fileName = `Resumen_Carteras_${plaza.name.replace(/\s/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  if (isLoading) {
    return <LoanControlSkeleton cards={6} showSummary />;
  }

  if (!plaza) {
    return (
      <div className="lc-surface p-8 text-center space-y-3">
        <p className="text-sm font-medium text-foreground">Plaza no encontrada.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/tools/loan-control">Volver a Control General</Link>
        </Button>
      </div>
    );
  }

  const expectedConfirmationText = carteraToDelete ? `${carteraToDelete.name} eliminar` : "";

  return (
    <TooltipProvider delayDuration={350} skipDelayDuration={250}>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <LoanControlBreadcrumbs
            items={[
              { label: "Control General", href: "/tools/loan-control" },
              { label: plaza.name },
            ]}
          />
          <NavPanel plazaId={plaza.id} />
        </div>

        <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-border">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Carteras de {plaza.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Administra carteras, revisa su balance y accede a los grupos asignados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Dialog
              open={isFormOpen}
              onOpenChange={(open) => {
                setFormOpen(open);
                if (!open) setEditingCartera(null);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => openForm(null)}
                  className="h-9 px-3.5 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 lc-pressable lc-touch-target"
                >
                  <PlusCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Crear Cartera
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCartera ? "Editar Cartera" : "Crear Cartera"}</DialogTitle>
                </DialogHeader>
                <CarteraForm
                  onSubmit={handleFormSubmit}
                  cartera={editingCartera}
                  isSubmitting={isSubmitting}
                />
              </DialogContent>
            </Dialog>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              disabled={filteredCarteras.length === 0}
              className="h-9 px-3 text-xs font-medium lc-pressable lc-touch-target"
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              Excel
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              disabled={filteredCarteras.length === 0}
              className="h-9 px-3 text-xs font-medium lc-pressable lc-touch-target"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              PDF
            </Button>
          </div>
        </header>

        <PortfolioSummaryBar
          totalLoaned={summary.totalLoaned}
          totalDue={summary.totalDue}
          secondaryMetric={{
            label: "Carteras",
            value: `${filteredCarteras.length}`,
            hint: `${summary.totalGroups} grupos en total`,
          }}
        />

        <div className="lc-surface p-3 flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 max-w-sm">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                aria-label="Buscar cartera por nombre"
                placeholder="Buscar cartera por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs sm:text-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            <Select value={sortPresetValue} onValueChange={handlePresetSortChange}>
              <SelectTrigger aria-label="Ordenar carteras" className="w-[185px] h-9 text-xs">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name:asc">Nombre (A–Z)</SelectItem>
                <SelectItem value="due:desc">Mayor saldo pendiente</SelectItem>
                <SelectItem value="loaned:desc">Mayor monto prestado</SelectItem>
                <SelectItem value="grupos:desc">Más grupos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>

        <div role="status" className="sr-only">
          Mostrando {filteredCarteras.length} carteras de la plaza {plaza.name}.
        </div>

        {filteredCarteras.length > 0 ? (
          viewMode === "cards" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredCarteras.map((cartera) => (
                <article key={cartera.id} className="lc-card-interactive group flex flex-col overflow-hidden">
                  <div className="p-4 pb-3 flex-1 space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60">
                          <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <h2
                            className="text-sm font-semibold leading-snug text-foreground truncate"
                            title={cartera.name}
                          >
                            {cartera.name}
                          </h2>
                          <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                            <Users className="h-3 w-3" aria-hidden="true" />
                            {cartera.grupoCount} {cartera.grupoCount === 1 ? "grupo" : "grupos"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => openForm(cartera)}
                              aria-label={`Editar cartera ${cartera.name}`}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground lc-pressable"
                            >
                              <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar cartera</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(cartera)}
                              aria-label={`Eliminar cartera ${cartera.name}`}
                              className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 lc-pressable"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar cartera</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2">
                        <span className="block text-[11px] font-medium text-muted-foreground">Prestado</span>
                        <span className="mt-0.5 block text-sm font-semibold text-foreground tabular-nums">
                          {formatCurrency(cartera.totalLoaned)}
                        </span>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2">
                        <span className="block text-[11px] font-medium text-muted-foreground">Pendiente</span>
                        <span
                          className={cn(
                            "mt-0.5 block text-sm font-semibold tabular-nums",
                            cartera.totalDue > 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {formatCurrency(cartera.totalDue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border bg-muted/30 px-3 py-2">
                    <Link
                      href={`/tools/loan-control/cartera/${cartera.id}`}
                      className="flex items-center justify-between rounded-md px-1.5 py-1 text-xs font-medium text-foreground/90 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lc-pressable"
                    >
                      <span>Administrar cartera</span>
                      <ArrowRight
                        className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div
              role="region"
              aria-label={`Tabla de carteras de ${plaza.name}`}
              tabIndex={0}
              className="lc-surface overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <table className="w-full min-w-[580px] border-collapse text-sm">
                <caption className="sr-only">Carteras de la plaza {plaza.name}</caption>
                <thead className="sticky top-0 z-10 border-b border-border bg-muted/60 backdrop-blur-sm">
                  <tr>
                    <SortableHeaderCell columnKey="name" label="Cartera" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableHeaderCell columnKey="grupos" label="Grupos" activeKey={sortKey} direction={sortDir} onSort={handleSort} align="right" />
                    <SortableHeaderCell columnKey="loaned" label="Prestado" activeKey={sortKey} direction={sortDir} onSort={handleSort} align="right" />
                    <SortableHeaderCell columnKey="due" label="Pendiente" activeKey={sortKey} direction={sortDir} onSort={handleSort} align="right" />
                    <th scope="col" className="h-10 px-3 text-right text-xs font-medium text-muted-foreground">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCarteras.map((cartera) => {
                    const loaned = cartera.totalLoaned || 0;
                    const due = cartera.totalDue || 0;
                    return (
                      <tr key={cartera.id} className="hover:bg-muted/40 transition-colors">
                        <th scope="row" className="px-3 py-3 text-left font-medium text-foreground">
                          <Link
                            href={`/tools/loan-control/cartera/${cartera.id}`}
                            className="hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                          >
                            {cartera.name}
                          </Link>
                        </th>
                        <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">
                          {cartera.grupoCount}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-foreground tabular-nums">
                          {formatCurrency(loaned)}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-3 text-right font-semibold tabular-nums",
                            due > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                          )}
                        >
                          {formatCurrency(due)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openForm(cartera)}
                                  aria-label={`Editar cartera ${cartera.name}`}
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground lc-pressable"
                                >
                                  <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar cartera</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDeleteDialog(cartera)}
                                  aria-label={`Eliminar cartera ${cartera.name}`}
                                  className="h-8 w-8 text-muted-foreground hover:text-rose-600 lc-pressable"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar cartera</TooltipContent>
                            </Tooltip>
                            <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs lc-pressable">
                              <Link href={`/tools/loan-control/cartera/${cartera.id}`}>
                                Abrir
                                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="lc-surface border-dashed p-10 flex flex-col items-center justify-center text-center gap-3">
            <Briefcase className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
            <div className="space-y-1 max-w-md">
              <h2 className="text-sm font-semibold text-foreground">
                {searchTerm ? "No se encontraron carteras" : "Sin carteras en esta plaza"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {searchTerm
                  ? "Intenta con otro nombre o limpia la búsqueda."
                  : "Crea la primera cartera para comenzar a organizar los grupos y clientes."}
              </p>
            </div>
            {searchTerm ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setSearchTerm("")} className="lc-pressable">
                Limpiar búsqueda
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={() => openForm(null)} className="lc-pressable">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Crear primera cartera
              </Button>
            )}
          </div>
        )}

        <AlertDialog open={!!carteraToDelete} onOpenChange={(open) => !open && closeDeleteDialog()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción es irreversible y eliminará la cartera{" "}
                <strong>{carteraToDelete?.name}</strong>, sus grupos y desasignará a sus clientes. Para
                confirmar, escribe <strong className="text-foreground">{expectedConfirmationText}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder={expectedConfirmationText}
              aria-label="Confirmación para eliminar cartera"
              autoFocus
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDeleteDialog}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!carteraToDelete || deleteConfirmationText !== expectedConfirmationText}
                onClick={handleDeleteCartera}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
