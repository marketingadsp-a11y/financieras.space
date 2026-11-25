"use client";

import * as React from "react";
import Link from "next/link";
import {
  getCarterasByPlaza,
  getGruposByPlaza,
  updateGrupo,
  deleteGrupo,
} from "@/services/loan-control-service";
import { getPlazaById } from "@/services/plaza-service";
import type { LoanControlCartera, LoanControlGrupo, Plaza } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { invalidateClientCache } from "@/lib/client-cache";
import { Folder, Users, Edit, Trash2, Search, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { GrupoForm } from "./grupo-form";
import { Input } from "@/components/ui/input";
import { NavPanel } from "./nav-panel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LoanControlBreadcrumbs,
  LoanControlSkeleton,
  collatorES,
} from "./loan-control-ui";

type GrupoWithCartera = LoanControlGrupo & { carteraName: string };

export function GruposManagement({ plazaId }: { plazaId: string }) {
  const { toast } = useToast();
  const [plaza, setPlaza] = React.useState<Plaza | null>(null);
  const [grupos, setGrupos] = React.useState<GrupoWithCartera[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isFormOpen, setFormOpen] = React.useState(false);
  const [editingGrupo, setEditingGrupo] = React.useState<LoanControlGrupo | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = React.useState("");
  const [grupoToDelete, setGrupoToDelete] = React.useState<LoanControlGrupo | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [plazaData, carterasData, plazaGrupos] = await Promise.all([
        getPlazaById(plazaId),
        getCarterasByPlaza(plazaId),
        getGruposByPlaza(plazaId),
      ]);
      setPlaza(plazaData);
      const carteraNameMap = new Map<string, string>(carterasData.map((c) => [c.id, c.name]));
      const allGrupos: GrupoWithCartera[] = plazaGrupos.map((g) => ({
        ...g,
        carteraName: carteraNameMap.get(g.carteraId) || "Cartera desconocida",
      }));
      allGrupos.sort((a, b) => collatorES.compare(a.name, b.name));
      setGrupos(allGrupos);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los grupos de la plaza.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [plazaId, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFormSubmit = async (
    values: Partial<Omit<LoanControlGrupo, "id" | "carteraId" | "plazaId" | "prefix">>
  ) => {
    if (!editingGrupo) return;
    setIsSubmitting(true);
    try {
      await updateGrupo(editingGrupo.id, values);
      toast({ title: "Éxito", description: "Grupo actualizado." });
      closeForm();
      invalidateClientCache("loan-control-plazas:", "loan-control-updated");
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el grupo." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGrupo = async () => {
    if (!grupoToDelete) return;
    try {
      await deleteGrupo(grupoToDelete.id);
      toast({ title: "Éxito", description: "Grupo eliminado." });
      setGrupoToDelete(null);
      setDeleteConfirmationText("");
      invalidateClientCache("loan-control-plazas:", "loan-control-updated");
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el grupo." });
    }
  };

  const openForm = (grupo: LoanControlGrupo) => {
    setEditingGrupo(grupo);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingGrupo(null);
  };

  const openDeleteDialog = (grupo: LoanControlGrupo) => {
    setDeleteConfirmationText("");
    setGrupoToDelete(grupo);
  };

  const closeDeleteDialog = () => {
    setGrupoToDelete(null);
    setDeleteConfirmationText("");
  };

  const groupedCarteras = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = query
      ? grupos.filter(
          (g) =>
            g.name.toLowerCase().includes(query) || g.carteraName.toLowerCase().includes(query)
        )
      : grupos;

    const grouped = filtered.reduce((acc, g) => {
      const list = acc.get(g.carteraName) || [];
      list.push(g);
      acc.set(g.carteraName, list);
      return acc;
    }, new Map<string, GrupoWithCartera[]>());

    return Array.from(grouped.entries()).sort(([nameA], [nameB]) =>
      collatorES.compare(nameA, nameB)
    );
  }, [grupos, searchTerm]);

  if (isLoading) {
    return <LoanControlSkeleton cards={6} showSummary={false} />;
  }

  const expectedConfirmationText = grupoToDelete ? `${grupoToDelete.name} eliminar` : "";
  const visibleTotal = groupedCarteras.reduce((sum, [, items]) => sum + items.length, 0);

  return (
    <TooltipProvider delayDuration={350} skipDelayDuration={250}>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <LoanControlBreadcrumbs
            items={[
              { label: "Control General", href: "/tools/loan-control" },
              { label: plaza?.name || "Plaza", href: `/tools/loan-control/plaza/${plazaId}` },
              { label: "Grupos" },
            ]}
          />
          <NavPanel plazaId={plazaId} />
        </div>

        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Grupos de {plaza?.name || "la Plaza"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Directorio completo de grupos agrupados por cartera.
            </p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            <strong className="text-foreground font-semibold">{groupedCarteras.length}</strong> carteras ·{" "}
            <strong className="text-foreground font-semibold">{visibleTotal}</strong> grupos
          </span>
        </header>

        <div className="lc-surface p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Buscar grupo o cartera"
              placeholder="Buscar por nombre de grupo o cartera..."
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
        </div>

        {groupedCarteras.length > 0 ? (
          <Accordion
            type="multiple"
            defaultValue={groupedCarteras.map(([name]) => name)}
            className="space-y-3"
          >
            {groupedCarteras.map(([carteraName, grupoList]) => (
              <AccordionItem
                value={carteraName}
                key={carteraName}
                className="lc-surface px-4 border overflow-hidden"
              >
                <AccordionTrigger className="py-3.5 hover:no-underline">
                  <div className="flex items-center gap-2.5 text-left">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/60">
                      <Folder className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{carteraName}</span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                      {grupoList.length}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {grupoList.map((grupo) => (
                      <div
                        key={grupo.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/25 px-3 py-2.5 hover:bg-muted/50 transition-colors"
                      >
                        <Link
                          href={`/tools/loan-control/grupo/${grupo.id}`}
                          className="flex items-center gap-2 min-w-0 flex-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="text-xs font-semibold text-foreground truncate hover:underline underline-offset-4">
                            {grupo.name}
                          </span>
                        </Link>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => openForm(grupo)}
                                aria-label={`Editar grupo ${grupo.name}`}
                                className="h-7 w-7 text-muted-foreground hover:text-foreground lc-pressable"
                              >
                                <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar grupo</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(grupo)}
                                aria-label={`Eliminar grupo ${grupo.name}`}
                                className="h-7 w-7 text-muted-foreground hover:text-rose-600 lc-pressable"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar grupo</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground lc-pressable"
                              >
                                <Link
                                  href={`/tools/loan-control/grupo/${grupo.id}`}
                                  aria-label={`Abrir clientes de ${grupo.name}`}
                                >
                                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver clientes</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="lc-surface border-dashed p-10 text-center space-y-2">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">No se encontraron grupos</p>
            <p className="text-xs text-muted-foreground">
              {searchTerm
                ? "Intenta con otro término o limpia el filtro."
                : "Crea grupos dentro de alguna cartera para verlos listados aquí."}
            </p>
            {searchTerm && (
              <Button type="button" variant="outline" size="sm" onClick={() => setSearchTerm("")} className="mt-2 lc-pressable">
                Limpiar búsqueda
              </Button>
            )}
          </div>
        )}

        <Dialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingGrupo(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Grupo</DialogTitle>
            </DialogHeader>
            <GrupoForm onSubmit={handleFormSubmit} grupo={editingGrupo} isSubmitting={isSubmitting} />
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!grupoToDelete} onOpenChange={(open) => !open && closeDeleteDialog()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción es irreversible y eliminará el grupo <strong>{grupoToDelete?.name}</strong> y
                desasignará a sus clientes. Para confirmar, escribe{" "}
                <strong className="text-foreground">{expectedConfirmationText}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder={expectedConfirmationText}
              aria-label="Confirmación para eliminar grupo"
              autoFocus
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDeleteDialog}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!grupoToDelete || deleteConfirmationText !== expectedConfirmationText}
                onClick={handleDeleteGrupo}
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
