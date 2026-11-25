"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import type { Plaza } from "@/lib/data";
import { getPlazas, updatePlaza } from "@/services/plaza-service";
import { getCachedOrFetch, invalidateClientCache } from "@/lib/client-cache";
import { clearDataByPrefix } from "@/services/loan-control-service";
import {
  Building,
  ArrowRight,
  Upload,
  FileUp,
  CalendarIcon,
  FilterX,
  MoreHorizontal,
  Trash2,
  Search,
  FileSpreadsheet,
  FileText,
  Edit,
  RefreshCcw,
  CheckCircle2,
  Eye,
  X,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDescriptionComponent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter as AlertDialogFooterComponent,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleComponent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { processAndImportLoanData } from "@/ai/flows/full-loan-data-parser-flow";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { PlazaEditDialog } from "./plaza-edit-dialog";
import { RecallDialog } from "./recall-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PortfolioSummaryBar,
  ViewModeToggle,
  SortableHeaderCell,
  LoanControlSkeleton,
  formatCurrency,
  collatorES,
  type ViewMode,
  type SortDirection,
} from "./loan-control-ui";

type PlazaSortKey = "name" | "prefix" | "loaned" | "due";

const PlazaCard = React.memo(
  ({
    plaza,
    onEdit,
    canEdit,
    onCheck,
  }: {
    plaza: Plaza;
    onEdit: (plaza: Plaza) => void;
    canEdit: boolean;
    onCheck: (plazaId: string) => void;
  }) => {
    const loaned = plaza.totalLoanAmount || 0;
    const due = plaza.pendingDebt || 0;
    const isInactive = loaned === 0 && due === 0;
    const isCleared = loaned > 0 && due <= 0;

    return (
      <article className="lc-card-interactive group flex flex-col overflow-hidden">
        <div className="p-4 pb-3 flex-1 space-y-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground">
                <Building className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2
                  className="text-sm font-semibold leading-snug text-foreground truncate"
                  title={plaza.name}
                >
                  {plaza.name}
                </h2>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="truncate">Prefijo: {plaza.prefix}</span>
                  {isCleared && (
                    <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      Liquidada
                    </span>
                  )}
                  {isInactive && (
                    <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      Sin saldo
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onCheck(plaza.id)}
                    aria-label={`Marcar plaza ${plaza.name} como revisada (oculta 3 minutos)`}
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 lc-pressable"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Marcar revisada (oculta 3 min)</TooltipContent>
              </Tooltip>

              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Opciones de plaza ${plaza.name}`}
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground lc-pressable"
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onEdit(plaza)} className="cursor-pointer text-xs">
                      <Edit className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                      Editar nombre
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2">
              <span className="block text-[11px] font-medium text-muted-foreground">Prestado</span>
              <span className="mt-0.5 block text-sm font-semibold text-foreground tabular-nums">
                {formatCurrency(loaned)}
              </span>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2">
              <span className="block text-[11px] font-medium text-muted-foreground">Pendiente</span>
              <span
                className={cn(
                  "mt-0.5 block text-sm font-semibold tabular-nums",
                  due > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                )}
              >
                {formatCurrency(due)}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-muted/30 px-3 py-2">
          <Link
            href={`/tools/loan-control/plaza/${plaza.id}`}
            className="flex items-center justify-between rounded-md px-1.5 py-1 text-xs font-medium text-foreground/90 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lc-pressable"
          >
            <span>Administrar plaza</span>
            <ArrowRight
              className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </article>
    );
  }
);
PlazaCard.displayName = "PlazaCard";

export function LoanControlDashboard() {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [plazas, setPlazas] = React.useState<Plaza[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isImportModalOpen, setImportModalOpen] = React.useState(false);
  const [isRecallModalOpen, setRecallModalOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [importMode, setImportMode] = React.useState<"add" | "replace">("add");
  const [isImporting, setIsImporting] = React.useState(false);
  const [startDate, setStartDate] = React.useState<Date | undefined>();
  const [endDate, setEndDate] = React.useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [deleteConfirmationText, setDeleteConfirmationText] = React.useState("");
  const [editingPlaza, setEditingPlaza] = React.useState<Plaza | null>(null);
  const [hiddenPlazas, setHiddenPlazas] = React.useState<Record<string, number>>({});
  const [viewMode, setViewMode] = React.useState<ViewMode>("cards");
  const [sortKey, setSortKey] = React.useState<PlazaSortKey>("name");
  const [sortDir, setSortDir] = React.useState<SortDirection>("asc");

  // Cleanup expired hidden plazas every 5 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setHiddenPlazas((prev) => {
        let hasChanges = false;
        const nextState = { ...prev };
        for (const [id, expireTime] of Object.entries(prev)) {
          if (now >= expireTime) {
            delete nextState[id];
            hasChanges = true;
          }
        }
        return hasChanges ? nextState : prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckPlaza = React.useCallback(
    (plazaId: string) => {
      const THREE_MINUTES = 3 * 60 * 1000;
      setHiddenPlazas((prev) => ({
        ...prev,
        [plazaId]: Date.now() + THREE_MINUTES,
      }));
      toast({
        title: "Plaza comprobada",
        description: "La plaza se ocultará por 3 minutos.",
      });
    },
    [toast]
  );

  const handleShowAllPlazas = () => {
    setHiddenPlazas({});
    toast({
      title: "Plazas visibilizadas",
      description: "Se están mostrando todas las plazas nuevamente.",
    });
  };

  const fetchPlazasForUser = React.useCallback(
    async (forceRefresh = false) => {
      if (!user) return;
      setIsLoading(true);
      try {
        const shouldFetchAll = user.isSuperAdmin || user.isToolAdmin;
        const cacheKey = `loan-control-plazas:${shouldFetchAll ? "all" : user.prefix || ""}`;
        if (forceRefresh) {
          invalidateClientCache("loan-control-plazas:", "loan-control-updated");
        }
        const hasDateFilter = Boolean(startDate || endDate);
        const plazasFromDb = hasDateFilter
          ? await getPlazas({
              prefix: user.prefix,
              fetchAll: shouldFetchAll,
              startDate,
              endDate,
              toolContext: "loan-control",
            })
          : await getCachedOrFetch(cacheKey, () =>
              getPlazas({
                prefix: user.prefix,
                fetchAll: shouldFetchAll,
                toolContext: "loan-control",
              })
            );
        const sortedPlazas = [...plazasFromDb].sort((a, b) => collatorES.compare(a.name, b.name));
        setPlazas(sortedPlazas);
      } catch (error) {
        console.error("Failed to fetch plazas", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las plazas.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [user, toast, startDate, endDate]
  );

  React.useEffect(() => {
    fetchPlazasForUser();
  }, [fetchPlazasForUser]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor, selecciona un archivo de Excel.",
      });
      return;
    }
    if (!user?.prefix) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No tienes un prefijo asignado para importar datos.",
      });
      return;
    }
    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileContent = e.target?.result as string;
        const base64Content = fileContent.split(",")[1];

        const result = await processAndImportLoanData({
          fileContentBase64: base64Content,
          importMode,
          prefix: user.prefix!,
        });

        if (result.success) {
          toast({ title: "Éxito", description: result.message });
          await fetchPlazasForUser(true);
          setImportModalOpen(false);
          setSelectedFile(null);
        } else {
          toast({ variant: "destructive", title: "Error de Importación", description: result.message });
        }
        setIsImporting(false);
      };
      reader.onerror = () => {
        toast({
          variant: "destructive",
          title: "Error de Archivo",
          description: "No se pudo leer el archivo seleccionado.",
        });
        setIsImporting(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de Importación",
        description: "Ocurrió un error inesperado al iniciar la importación.",
      });
      setIsImporting(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!user?.prefix) return;
    try {
      await clearDataByPrefix(user.prefix);
      toast({
        title: "Éxito",
        description: "Todos los datos de Control de Préstamo han sido eliminados.",
      });
      await fetchPlazasForUser(true);
      setDeleteConfirmationText("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron eliminar los datos.",
      });
    }
  };

  const handleUpdatePlaza = async (id: string, newName: string) => {
    try {
      await updatePlaza(id, { name: newName });
      toast({ title: "Éxito", description: "Nombre de la plaza actualizado." });
      setEditingPlaza(null);
      fetchPlazasForUser(true);
      return true;
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la plaza." });
      return false;
    }
  };

  const hiddenCount = Object.keys(hiddenPlazas).length;

  const filteredPlazas = React.useMemo(() => {
    const now = Date.now();
    const query = searchTerm.trim().toLowerCase();
    const visible = plazas.filter((plaza) => {
      if (hiddenPlazas[plaza.id] && hiddenPlazas[plaza.id] > now) {
        return false;
      }
      if (!query) return true;
      return (
        plaza.name.toLowerCase().includes(query) ||
        (plaza.prefix || "").toLowerCase().includes(query)
      );
    });

    const factor = sortDir === "asc" ? 1 : -1;
    return [...visible].sort((a, b) => {
      switch (sortKey) {
        case "prefix":
          return factor * collatorES.compare(a.prefix || "", b.prefix || "");
        case "loaned":
          return factor * ((a.totalLoanAmount || 0) - (b.totalLoanAmount || 0));
        case "due":
          return factor * ((a.pendingDebt || 0) - (b.pendingDebt || 0));
        case "name":
        default:
          return factor * collatorES.compare(a.name, b.name);
      }
    });
  }, [plazas, searchTerm, hiddenPlazas, sortKey, sortDir]);

  const filteredSummary = React.useMemo(() => {
    return filteredPlazas.reduce(
      (acc, plaza) => {
        const loaned = plaza.totalLoanAmount || 0;
        const due = plaza.pendingDebt || 0;
        acc.totalLoaned += loaned;
        acc.totalDue += due;
        if (loaned > 0 || due > 0) acc.activeCount += 1;
        return acc;
      },
      { totalLoaned: 0, totalDue: 0, activeCount: 0 }
    );
  }, [filteredPlazas]);

  const hasActiveFilters = Boolean(searchTerm.trim() || startDate || endDate);

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchTerm("");
  };

  const handleSort = (nextKey: PlazaSortKey) => {
    if (sortKey === nextKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDir(nextKey === "name" || nextKey === "prefix" ? "asc" : "desc");
    }
  };

  const sortPresetValue = `${sortKey}:${sortDir}`;
  const handlePresetSortChange = (val: string) => {
    const [key, dir] = val.split(":") as [PlazaSortKey, SortDirection];
    if (key && dir) {
      setSortKey(key);
      setSortDir(dir);
    }
  };

  const getDateRangeString = () => {
    if (startDate && endDate) return `Del ${format(startDate, "dd/MM/yyyy")} al ${format(endDate, "dd/MM/yyyy")}`;
    if (startDate) return `Desde ${format(startDate, "dd/MM/yyyy")}`;
    if (endDate) return `Hasta ${format(endDate, "dd/MM/yyyy")}`;
    return "Todas las fechas";
  };

  const exportToPDF = async () => {
    if (filteredPlazas.length === 0) return;
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const activePlazas = filteredPlazas.filter(
      (p) => (p.totalLoanAmount || 0) > 0 || (p.pendingDebt || 0) > 0
    );
    const inactivePlazas = filteredPlazas.filter(
      (p) => (p.totalLoanAmount || 0) === 0 && (p.pendingDebt || 0) === 0
    );

    const pdfTotalLoaned = activePlazas.reduce((acc, p) => acc + (p.totalLoanAmount || 0), 0);
    const pdfTotalDue = activePlazas.reduce((acc, p) => acc + (p.pendingDebt || 0), 0);

    const doc = new jsPDF();

    doc.setFillColor(15, 23, 42);
    doc.rect(14, 15, 182, 22, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text("CONTROL DE PRÉSTAMOS - REPORTE EJECUTIVO", 20, 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text(`Rango de Fechas: ${getDateRangeString()}`, 20, 31);

    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`Fecha: ${format(new Date(), "dd/MM/yyyy")}`, 145, 27);

    const cardWidth = 58;
    const cardHeight = 22;
    const cardY = 43;

    doc.setFillColor(240, 253, 244);
    doc.rect(14, cardY, cardWidth, cardHeight, "F");
    doc.setDrawColor(187, 247, 208);
    doc.rect(14, cardY, cardWidth, cardHeight, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(22, 101, 52);
    doc.text("TOTAL PRESTADO (ACTIVAS)", 18, cardY + 6);
    doc.setFontSize(11);
    doc.text(
      `$${pdfTotalLoaned.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      18,
      cardY + 14
    );

    doc.setFillColor(254, 242, 242);
    doc.rect(14 + cardWidth + 4, cardY, cardWidth, cardHeight, "F");
    doc.setDrawColor(254, 202, 202);
    doc.rect(14 + cardWidth + 4, cardY, cardWidth, cardHeight, "S");

    doc.setFontSize(7);
    doc.setTextColor(153, 27, 27);
    doc.text("DEUDA PENDIENTE (ACTIVAS)", 14 + cardWidth + 8, cardY + 6);
    doc.setFontSize(11);
    doc.text(
      `$${pdfTotalDue.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      14 + cardWidth + 8,
      cardY + 14
    );

    doc.setFillColor(241, 245, 249);
    doc.rect(14 + cardWidth * 2 + 8, cardY, cardWidth, cardHeight, "F");
    doc.setDrawColor(203, 213, 225);
    doc.rect(14 + cardWidth * 2 + 8, cardY, cardWidth, cardHeight, "S");

    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text("PLAZAS ACTIVAS / TOTAL", 14 + cardWidth * 2 + 12, cardY + 6);
    doc.setFontSize(11);
    doc.text(`${activePlazas.length} de ${filteredPlazas.length}`, 14 + cardWidth * 2 + 12, cardY + 14);

    let nextY = 72;
    if (activePlazas.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("DISTRIBUCIÓN DE CARTERA POR PLAZA (TOP 5)", 14, nextY);

      doc.setFillColor(74, 222, 128);
      doc.rect(125, nextY - 3, 3, 3, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text("Prestado", 130, nextY - 0.5);

      doc.setFillColor(248, 113, 113);
      doc.rect(155, nextY - 3, 3, 3, "F");
      doc.text("Pendiente", 160, nextY - 0.5);

      const sortedActive = [...activePlazas].sort(
        (a, b) => (b.totalLoanAmount || 0) - (a.totalLoanAmount || 0)
      );
      const topActive = sortedActive.slice(0, 5);
      const maxLoaned = Math.max(...topActive.map((p) => p.totalLoanAmount || 0), 1);

      let chartY = nextY + 7;
      topActive.forEach((p) => {
        const loaned = p.totalLoanAmount || 0;
        const due = p.pendingDebt || 0;
        const barWidthMax = 65;

        const loanedWidth = (loaned / maxLoaned) * barWidthMax;
        const dueWidth = (due / maxLoaned) * barWidthMax;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        doc.text(p.name, 14, chartY);

        doc.setFillColor(240, 253, 244);
        doc.rect(65, chartY - 2.5, barWidthMax, 3, "F");
        doc.setFillColor(74, 222, 128);
        doc.rect(65, chartY - 2.5, loanedWidth, 3, "F");

        doc.setFillColor(254, 242, 242);
        doc.rect(65, chartY + 1.5, barWidthMax, 3, "F");
        doc.setFillColor(248, 113, 113);
        doc.rect(65, chartY + 1.5, dueWidth, 3, "F");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(22, 101, 52);
        doc.text(`$${loaned.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`, 65 + barWidthMax + 2, chartY - 0.5);
        doc.setTextColor(153, 27, 27);
        doc.text(`$${due.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`, 65 + barWidthMax + 2, chartY + 3.5);

        chartY += 10;
      });
      nextY = chartY + 4;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("DETALLE DE PLAZAS ACTIVAS", 14, nextY);

    autoTable(doc, {
      startY: nextY + 3,
      head: [["Plaza", "Prefijo", "Total Prestado", "Deuda Pendiente"]],
      body: activePlazas.map((p) => [
        p.name,
        p.prefix || "N/A",
        `$${(p.totalLoanAmount || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `$${(p.pendingDebt || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ]),
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold",
      },
      bodyStyles: { fontSize: 7.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });

    nextY = (doc as any).lastAutoTable.finalY + 10;

    if (inactivePlazas.length > 0) {
      if (nextY > 260) {
        doc.addPage();
        nextY = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("PLAZAS SIN OPERACIÓN (SALDO EN $0)", 14, nextY);

      autoTable(doc, {
        startY: nextY + 3,
        head: [["Plaza", "Prefijo", "Estado"]],
        body: inactivePlazas.map((p) => [p.name, p.prefix || "N/A", "Sin actividad registrada"]),
        headStyles: {
          fillColor: [100, 116, 139],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
        },
        bodyStyles: { fontSize: 7.5, textColor: [100, 116, 139] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      });
    }

    const fileName = `Reporte_Ejecutivo_Control_Prestamo_${format(new Date(), "yyyy-MM-dd")}.pdf`;
    doc.save(fileName);
  };

  const exportToExcel = async () => {
    if (filteredPlazas.length === 0) return;
    const XLSX = await import("xlsx");
    const dataToExport = filteredPlazas.map((p) => ({
      Plaza: p.name,
      Prefijo: p.prefix,
      "Total Prestado": p.totalLoanAmount,
      "Deuda Pendiente": p.pendingDebt,
    }));

    const worksheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(worksheet, [["Resumen de Plazas - Control de Préstamo"]], { origin: "A1" });
    XLSX.utils.sheet_add_aoa(worksheet, [[`Rango de Fechas: ${getDateRangeString()}`]], { origin: "A2" });
    XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: "A4" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resumen de Plazas");
    const fileName = `Resumen_Plazas_Control_Prestamo_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const canEditPlazaNames = hasPermission("loan-control", "CAN_EDIT_PLAZA_NAMES");
  const canDeleteAllData = hasPermission("loan-control", "CAN_DELETE_ALL_DATA");
  const isFortunaAdmin = user?.prefix === "fortuna" && user?.username === "admin";
  const expectedConfirmationText = "ELIMINAR TODO";

  if (isLoading) {
    return <LoanControlSkeleton cards={8} showSummary />;
  }

  return (
    <TooltipProvider delayDuration={350} skipDelayDuration={250}>
      <div className="space-y-5">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Control de Préstamos
            </h1>
            <p className="text-sm text-muted-foreground">
              Supervisa plazas, carteras, grupos y recuperación de saldos en un solo flujo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isFortunaAdmin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRecallModalOpen(true)}
                className="h-9 px-3 text-xs font-medium lc-pressable lc-touch-target"
              >
                <RefreshCcw className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                Recall
              </Button>
            )}

            <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 px-3.5 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 lc-pressable lc-touch-target"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Importar Excel
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Importación Masiva de Excel</DialogTitle>
                  <DialogDescriptionComponent>
                    Selecciona un archivo `.xlsx` o `.xls` con las columnas: Gerente, Cartera, Grupo, Nombre y Préstamo.
                  </DialogDescriptionComponent>
                </DialogHeader>
                <div className="grid gap-4 py-3">
                  <div className="space-y-2.5">
                    <Label className="text-xs font-semibold text-foreground">Modo de importación</Label>
                    <RadioGroup
                      defaultValue="add"
                      value={importMode}
                      onValueChange={(value) => setImportMode(value as "add" | "replace")}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                    >
                      <Label
                        htmlFor="r1"
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border p-3 text-xs font-medium cursor-pointer transition-colors",
                          importMode === "add"
                            ? "border-foreground/40 bg-muted/60 text-foreground"
                            : "border-border hover:bg-muted/30"
                        )}
                      >
                        <RadioGroupItem value="add" id="r1" />
                        <span>Añadir a existentes</span>
                      </Label>
                      <Label
                        htmlFor="r2"
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border p-3 text-xs font-medium cursor-pointer transition-colors",
                          importMode === "replace"
                            ? "border-rose-500/60 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                            : "border-border hover:bg-muted/30"
                        )}
                      >
                        <RadioGroupItem value="replace" id="r2" />
                        <span>Reemplazar datos</span>
                      </Label>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="excel-file" className="text-xs font-semibold text-foreground">
                      Archivo de Excel
                    </Label>
                    <Input
                      id="excel-file"
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setImportModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleImport} disabled={isImporting || !selectedFile}>
                    {isImporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <FileUp className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    {isImporting ? "Importando..." : "Importar Archivo"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              disabled={filteredPlazas.length === 0}
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
              disabled={filteredPlazas.length === 0}
              className="h-9 px-3 text-xs font-medium lc-pressable lc-touch-target"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              PDF
            </Button>

            {canDeleteAllData && (
              <AlertDialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Más opciones del módulo"
                      className="h-9 w-9 lc-pressable lc-touch-target"
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Opciones avanzadas</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer text-xs"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                        Eliminar datos del prefijo
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                  </DropdownMenuContent>
                </DropdownMenu>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitleComponent>¿Estás absolutamente seguro?</AlertDialogTitleComponent>
                    <AlertDialogDescription>
                      Esta acción es irreversible y eliminará permanentemente <strong>TODAS</strong> las plazas,
                      carteras, grupos y clientes de Control de Préstamo para el prefijo{" "}
                      <strong>{user?.prefix}</strong>. Para confirmar, escribe{" "}
                      <strong className="text-foreground">{expectedConfirmationText}</strong>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder={expectedConfirmationText}
                    aria-label="Texto de confirmación para eliminar todos los datos"
                    autoFocus
                  />
                  <AlertDialogFooterComponent>
                    <AlertDialogCancel onClick={() => setDeleteConfirmationText("")}>
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAllData}
                      disabled={deleteConfirmationText !== expectedConfirmationText}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sí, eliminar todo
                    </AlertDialogAction>
                  </AlertDialogFooterComponent>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </header>

        <PortfolioSummaryBar
          totalLoaned={filteredSummary.totalLoaned}
          totalDue={filteredSummary.totalDue}
          loanedLabel="Total Prestado (Filtrado)"
          dueLabel="Saldo Pendiente (Filtrado)"
          secondaryMetric={{
            label: "Plazas activas",
            value: `${filteredSummary.activeCount} de ${filteredPlazas.length}`,
            hint: getDateRangeString(),
          }}
        />

        <div className="lc-surface p-3 flex flex-col xl:flex-row gap-2.5 xl:items-center justify-between">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                aria-label="Buscar plaza o prefijo"
                placeholder="Buscar plaza o prefijo..."
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

            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-start"
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-[136px] h-9 justify-start text-left text-xs font-medium tabular-nums lc-pressable",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : <span>Fecha inicio</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} locale={es} initialFocus />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-end"
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-[136px] h-9 justify-start text-left text-xs font-medium tabular-nums lc-pressable",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : <span>Fecha fin</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} locale={es} initialFocus />
                </PopoverContent>
              </Popover>

              <Select value={sortPresetValue} onValueChange={handlePresetSortChange}>
                <SelectTrigger aria-label="Ordenar plazas" className="w-[175px] h-9 text-xs">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name:asc">Nombre (A–Z)</SelectItem>
                  <SelectItem value="due:desc">Mayor saldo pendiente</SelectItem>
                  <SelectItem value="loaned:desc">Mayor monto prestado</SelectItem>
                  <SelectItem value="due:asc">Menor saldo pendiente</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground lc-pressable"
                >
                  <FilterX className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {hiddenCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleShowAllPlazas}
                className="h-9 text-xs border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 lc-pressable"
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Mostrar {hiddenCount} ocultas
              </Button>
            )}
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>

        <div role="status" className="sr-only">
          Mostrando {filteredPlazas.length} plazas ordenadas por {sortKey} ({sortDir === "asc" ? "ascendente" : "descendente"}).
        </div>

        {filteredPlazas.length > 0 ? (
          viewMode === "cards" ? (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPlazas.map((plaza) => (
                <PlazaCard
                  key={plaza.id}
                  plaza={plaza}
                  onEdit={setEditingPlaza}
                  canEdit={canEditPlazaNames}
                  onCheck={handleCheckPlaza}
                />
              ))}
            </div>
          ) : (
            <div
              role="region"
              aria-label="Tabla comparativa de plazas"
              tabIndex={0}
              className="lc-surface overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <table className="w-full min-w-[600px] border-collapse text-sm">
                <caption className="sr-only">Resumen financiero de plazas en Control de Préstamos</caption>
                <thead className="sticky top-0 z-10 border-b border-border bg-muted/60 backdrop-blur-sm">
                  <tr>
                    <SortableHeaderCell
                      columnKey="name"
                      label="Plaza"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeaderCell
                      columnKey="prefix"
                      label="Prefijo"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeaderCell
                      columnKey="loaned"
                      label="Prestado"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeaderCell
                      columnKey="due"
                      label="Pendiente"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                    />
                    <th scope="col" className="h-10 px-3 text-right text-xs font-medium text-muted-foreground">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPlazas.map((plaza) => {
                    const loaned = plaza.totalLoanAmount || 0;
                    const due = plaza.pendingDebt || 0;
                    return (
                      <tr key={plaza.id} className="hover:bg-muted/40 transition-colors">
                        <th scope="row" className="px-3 py-3 text-left font-medium text-foreground">
                          <Link
                            href={`/tools/loan-control/plaza/${plaza.id}`}
                            className="hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                          >
                            {plaza.name}
                          </Link>
                        </th>
                        <td className="px-3 py-3 text-xs text-muted-foreground">{plaza.prefix}</td>
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
                                  onClick={() => handleCheckPlaza(plaza.id)}
                                  aria-label={`Marcar plaza ${plaza.name} como revisada`}
                                  className="h-8 w-8 text-muted-foreground hover:text-emerald-600 lc-pressable"
                                >
                                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Marcar revisada (3 min)</TooltipContent>
                            </Tooltip>
                            {canEditPlazaNames && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditingPlaza(plaza)}
                                    aria-label={`Editar nombre de ${plaza.name}`}
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground lc-pressable"
                                  >
                                    <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar nombre</TooltipContent>
                              </Tooltip>
                            )}
                            <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs lc-pressable">
                              <Link href={`/tools/loan-control/plaza/${plaza.id}`}>
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
            <Building className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
            <div className="space-y-1 max-w-md">
              <h2 className="text-sm font-semibold text-foreground">
                {plazas.length > 0 ? "Sin resultados con estos filtros" : "No hay plazas registradas"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {plazas.length > 0
                  ? "Ajusta la búsqueda, cambia el rango de fechas o vuelve a mostrar plazas ocultas."
                  : "Importa un archivo Excel con la columna Gerente para crear plazas y carteras automáticamente."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {plazas.length === 0 ? (
                <Button type="button" size="sm" onClick={() => setImportModalOpen(true)} className="lc-pressable">
                  <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Importar Excel
                </Button>
              ) : (
                <>
                  {hasActiveFilters && (
                    <Button type="button" variant="outline" size="sm" onClick={clearFilters} className="lc-pressable">
                      <FilterX className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Limpiar filtros
                    </Button>
                  )}
                  {hiddenCount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleShowAllPlazas}
                      className="lc-pressable border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Mostrar {hiddenCount} ocultas
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <PlazaEditDialog
          plaza={editingPlaza}
          isOpen={!!editingPlaza}
          onClose={() => setEditingPlaza(null)}
          onSave={handleUpdatePlaza}
        />

        <RecallDialog
          isOpen={isRecallModalOpen}
          onClose={() => setRecallModalOpen(false)}
          plazas={plazas}
          onSuccess={() => fetchPlazasForUser(true)}
        />
      </div>
    </TooltipProvider>
  );
}
