"use client";

import * as React from "react";
import Link from "next/link";
import {
  getLoanControlCarteraDetailData,
  addGrupo,
  updateGrupo,
  deleteGrupo,
} from "@/services/loan-control-service";
import type { LoanControlGrupo, LoanControlCartera, Plaza } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Users, Edit, Trash2, ArrowRight, Search, PlusCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { invalidateClientCache } from "@/lib/client-cache";
import { GrupoForm } from "./grupo-form";
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
import { NavPanel } from "./nav-panel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LoanControlBreadcrumbs,
  LoanControlSkeleton,
  collatorES,
} from "./loan-control-ui";

export function CarteraDetail({ carteraId }: { carteraId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cartera, setCartera] = React.useState<LoanControlCartera | null>(null);
  const [plaza, setPlaza] = React.useState<Plaza | null>(null);
  const [grupos, setGrupos] = React.useState<LoanControlGrupo[]>([]);
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
      const {
        cartera: carteraData,
        plaza: plazaData,
        grupos: gruposData,
      } = await getLoanControlCarteraDetailData(carteraId);
      setCartera(carteraData);
      setPlaza(plazaData);
      setGrupos([...gruposData].sort((a, b) => collatorES.compare(a.name, b.name)));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la información de la cartera.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [carteraId, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredGrupos = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return grupos;
    return grupos.filter((g) => g.name.toLowerCase().includes(query));
  }, [grupos, searchTerm]);

  const handleFormSubmit = async (
    values: Omit<LoanControlGrupo, "id" | "carteraId" | "plazaId" | "prefix">
  ) => {
    if (!user?.prefix || !cartera) return;
    setIsSubmitting(true);
    try {
      if (editingGrupo) {
        await updateGrupo(editingGrupo.id, values);
        toast({ title: "Éxito", description: "Grupo actualizado." });
      } else {
        const dataToSave = { ...values, carteraId, plazaId: cartera.plazaId, prefix: user.prefix };
        await addGrupo(dataToSave);
        toast({ title: "Éxito", description: "Grupo creado." });
      }
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

  const openForm = (grupo: LoanControlGrupo | null = null) => {
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

  if (isLoading) {
    return <LoanControlSkeleton cards={8} showSummary={false} />;
  }

  if (!cartera || !plaza) {
    return (
      <div className="lc-surface p-8 text-center space-y-3">
        <p className="text-sm font-medium text-foreground">Cartera o plaza no encontrada.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/tools/loan-control">Volver a Control General</Link>
        </Button>
      </div>
    );
  }

  const expectedConfirmationText = grupoToDelete ? `${grupoToDelete.name} eliminar` : "";

  return (
    <TooltipProvider delayDuration={350} skipDelayDuration={250}>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <LoanControlBreadcrumbs
            items={[
              { label: "Control General", href: "/tools/loan-control" },
              { label: plaza.name, href: `/tools/loan-control/plaza/${plaza.id}` },
              { label: cartera.name },
            ]}
          />
          <NavPanel plazaId={plaza.id} />
        </div>

        <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-border">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Grupos de {cartera.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Plaza {plaza.name} ·{" "}
              <span className="tabular-nums font-medium text-foreground">
                {grupos.length} {grupos.length === 1 ? "grupo registrado" : "grupos registrados"}
              </span>
            </p>
          </div>

          <Dialog
            open={isFormOpen}
            onOpenChange={(open) => {
              setFormOpen(open);
              if (!open) setEditingGrupo(null);
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
                Crear Grupo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingGrupo ? "Editar Grupo" : "Crear Grupo"}</DialogTitle>
              </DialogHeader>
              <GrupoForm onSubmit={handleFormSubmit} grupo={editingGrupo} isSubmitting={isSubmitting} />
            </DialogContent>
          </Dialog>
        </header>

        <div className="lc-surface p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Buscar grupo por nombre"
              placeholder="Buscar grupo por nombre..."
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
          <span className="text-xs text-muted-foreground tabular-nums">
            Mostrando <strong className="text-foreground font-semibold">{filteredGrupos.length}</strong> de{" "}
            {grupos.length} grupos
          </span>
        </div>

        {filteredGrupos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredGrupos.map((grupo) => (
              <article key={grupo.id} className="lc-card-interactive group flex flex-col overflow-hidden">
                <div className="p-4 flex items-center justify-between gap-2">
                  <Link
                    href={`/tools/loan-control/grupo/${grupo.id}`}
                    className="flex items-center gap-2.5 min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60">
                      <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h2
                        className="text-sm font-semibold text-foreground truncate group-hover:underline underline-offset-4"
                        title={grupo.name}
                      >
                        {grupo.name}
                      </h2>
                      <span className="text-xs text-muted-foreground">Ver clientes</span>
                    </div>
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
                          className="h-8 w-8 text-muted-foreground hover:text-foreground lc-pressable"
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
                          className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 lc-pressable"
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
                          className="h-8 w-8 text-muted-foreground hover:text-foreground lc-pressable"
                        >
                          <Link
                            href={`/tools/loan-control/grupo/${grupo.id}`}
                            aria-label={`Abrir clientes de ${grupo.name}`}
                          >
                            <ArrowRight
                              className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                              aria-hidden="true"
                            />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Abrir grupo</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="lc-surface border-dashed p-10 flex flex-col items-center justify-center text-center gap-3">
            <Users className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
            <div className="space-y-1 max-w-md">
              <h2 className="text-sm font-semibold text-foreground">
                {searchTerm ? "No se encontraron grupos" : "Sin grupos en esta cartera"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {searchTerm
                  ? "Intenta con otro término o limpia la búsqueda."
                  : "Crea el primer grupo para asignar y dar seguimiento a los clientes."}
              </p>
            </div>
            {searchTerm ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setSearchTerm("")} className="lc-pressable">
                Limpiar búsqueda
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={() => openForm(null)} className="lc-pressable">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Crear primer grupo
              </Button>
            )}
          </div>
        )}

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
