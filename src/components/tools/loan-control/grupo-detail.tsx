"use client";

import * as React from "react";
import Link from "next/link";
import { getLoanControlGrupoDetailData } from "@/services/loan-control-service";
import { addMultipleCustomers } from "@/services/customer-service";
import { invalidateClientCache } from "@/lib/client-cache";
import type { Customer, LoanControlGrupo, LoanControlCartera, Plaza } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  DollarSign,
  Users,
  Pencil,
  Phone,
  Home,
  FileText,
  FileSpreadsheet,
  ClipboardPaste,
  CalendarIcon as CalendarIconLucide,
  FilterX,
  Search,
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CustomerEditDialog } from "@/components/tools/overdue-portfolio/customer-edit-dialog";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDescriptionComponent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { parseCustomers } from "@/ai/flows/customer-parser-flow";
import { useAuth } from "@/context/auth-context";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { NavPanel } from "./nav-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type CustomerStatusFilter = "all" | "pending" | "paid";
type CustomerSortKey = "name" | "loaned" | "due" | "date" | "status";

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0] || "CL").slice(0, 2).toUpperCase();
};

const StatusBadge = ({ isPaid }: { isPaid: boolean }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border shrink-0",
      isPaid
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
    )}
  >
    {isPaid ? (
      <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
    ) : (
      <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
    )}
    <span>{isPaid ? "Pagado" : "Pendiente"}</span>
  </span>
);

const CustomerInfoCard = React.memo(
  ({
    customer,
    onEdit,
    onPayment,
  }: {
    customer: Customer;
    onEdit: (c: Customer) => void;
    onPayment: (c: Customer) => void;
  }) => {
    const isPaid = (customer.dueAmount || 0) <= 0;
    const loaned = customer.loanAmount || 0;
    const due = customer.dueAmount || 0;

    return (
      <article className="lc-card-interactive flex flex-col overflow-hidden">
        <div className="p-4 pb-3 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground select-none"
              >
                {getInitials(customer.name)}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground truncate" title={customer.name}>
                  {customer.name}
                </h2>
                <p className="text-xs text-muted-foreground truncate" title={customer.address}>
                  {customer.address || "Sin dirección"}
                </p>
              </div>
            </div>
            <StatusBadge isPaid={isPaid} />
          </div>

          {customer.phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{customer.phone}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-border/70 bg-muted/40 p-2 text-center">
            <div>
              <span className="block text-[11px] font-medium text-muted-foreground">Préstamo</span>
              <span className="mt-0.5 block text-xs font-semibold text-foreground tabular-nums">
                {formatCurrency(loaned)}
              </span>
            </div>
            <div className="border-x border-border/60">
              <span className="block text-[11px] font-medium text-muted-foreground">Saldo</span>
              <span
                className={cn(
                  "mt-0.5 block text-xs font-semibold tabular-nums",
                  isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}
              >
                {formatCurrency(due)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-medium text-muted-foreground">Fecha</span>
              <span className="mt-0.5 block text-xs font-medium text-foreground/80 tabular-nums">
                {customer.fechaPrestamo
                  ? format(new Date(customer.fechaPrestamo), "dd/MM/yy")
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-border bg-muted/30 px-3 py-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(customer)}
            aria-label={`Editar datos de ${customer.name}`}
            className="flex-1 h-8 text-xs font-medium lc-pressable"
          >
            <Pencil className="mr-1.5 h-3 w-3" aria-hidden="true" />
            Editar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onPayment(customer)}
            disabled={isPaid}
            aria-label={isPaid ? `${customer.name} ya está liquidado` : `Registrar abono para ${customer.name}`}
            className={cn(
              "flex-1 h-8 text-xs font-medium lc-pressable",
              !isPaid &&
                "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            )}
          >
            <DollarSign className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {isPaid ? "Liquidado" : "Abonar"}
          </Button>
        </div>
      </article>
    );
  }
);
CustomerInfoCard.displayName = "CustomerInfoCard";

export function GrupoDetail({ grupoId }: { grupoId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [grupo, setGrupo] = React.useState<LoanControlGrupo | null>(null);
  const [cartera, setCartera] = React.useState<LoanControlCartera | null>(null);
  const [plaza, setPlaza] = React.useState<Plaza | null>(null);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [dialogMode, setDialogMode] = React.useState<"edit" | "payment">("edit");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<CustomerStatusFilter>("all");
  const [isImportModalOpen, setImportModalOpen] = React.useState(false);
  const [importText, setImportText] = React.useState("");
  const [isParsing, setIsParsing] = React.useState(false);
  const [importMode, setImportMode] = React.useState<"add" | "replace">("add");
  const [startDate, setStartDate] = React.useState<Date | undefined>();
  const [endDate, setEndDate] = React.useState<Date | undefined>();
  const [visibleCount, setVisibleCount] = React.useState(48);
  const [viewMode, setViewMode] = React.useState<ViewMode>("cards");
  const [sortKey, setSortKey] = React.useState<CustomerSortKey>("name");
  const [sortDir, setSortDir] = React.useState<SortDirection>("asc");

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        grupo: grupoData,
        cartera: carteraData,
        plaza: plazaData,
        customers: customersData,
      } = await getLoanControlGrupoDetailData(grupoId);
      setGrupo(grupoData);
      setCartera(carteraData);
      setPlaza(plazaData);
      setCustomers(customersData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la información del grupo.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [grupoId, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (customer: Customer, mode: "edit" | "payment") => {
    setSelectedCustomer(customer);
    setDialogMode(mode);
  };

  const handleCloseDialog = () => {
    setSelectedCustomer(null);
  };

  const handleSuccess = () => {
    invalidateClientCache("loan-control-plazas:", "loan-control-updated");
    fetchData();
  };

  const handleImport = async () => {
    if (!importText.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El área de texto no puede estar vacía.",
      });
      return;
    }
    if (!user?.prefix || !grupo) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo determinar el prefijo o el grupo.",
      });
      return;
    }
    setIsParsing(true);
    try {
      const parsedData = await parseCustomers({ inputText: importText });
      if (!parsedData || parsedData.length === 0) {
        toast({
          variant: "destructive",
          title: "Error de IA",
          description: "La IA no pudo procesar el texto. Verifica el formato.",
        });
        return;
      }

      const customersToAdd = parsedData.map((c) => ({
        ...c,
        plazaId: grupo.plazaId,
        status: "Pendiente" as const,
        loanControlGroupId: grupoId,
      })) as any;

      await addMultipleCustomers(customersToAdd, importMode, user.prefix, grupo.plazaId, grupoId);
      invalidateClientCache("loan-control-plazas:", "loan-control-updated");

      toast({
        title: "Éxito",
        description: `${customersToAdd.length} clientes importados y asignados a este grupo.`,
      });
      await fetchData();
      setImportModalOpen(false);
      setImportText("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de Importación",
        description: "Ocurrió un error al importar los clientes.",
      });
      console.error(error);
    } finally {
      setIsParsing(false);
    }
  };

  const dateAndSearchCustomers = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return customers
      .filter((c) => {
        if (!query) return true;
        return (
          c.name.toLowerCase().includes(query) ||
          (c.address || "").toLowerCase().includes(query) ||
          (c.phone || "").toLowerCase().includes(query)
        );
      })
      .filter((c) => {
        if (!c.fechaPrestamo) return true;
        const loanDate = new Date(c.fechaPrestamo);
        if (startDate && loanDate < startDate) return false;
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (loanDate > endOfDay) return false;
        }
        return true;
      });
  }, [customers, searchTerm, startDate, endDate]);

  const statusCounts = React.useMemo(() => {
    let pending = 0;
    let paid = 0;
    for (const c of dateAndSearchCustomers) {
      if ((c.dueAmount || 0) <= 0) paid += 1;
      else pending += 1;
    }
    return { all: dateAndSearchCustomers.length, pending, paid };
  }, [dateAndSearchCustomers]);

  const filteredCustomers = React.useMemo(() => {
    const byStatus = dateAndSearchCustomers.filter((c) => {
      if (statusFilter === "pending") return (c.dueAmount || 0) > 0;
      if (statusFilter === "paid") return (c.dueAmount || 0) <= 0;
      return true;
    });

    const factor = sortDir === "asc" ? 1 : -1;
    return [...byStatus].sort((a, b) => {
      switch (sortKey) {
        case "loaned":
          return factor * ((a.loanAmount || 0) - (b.loanAmount || 0));
        case "due":
          return factor * ((a.dueAmount || 0) - (b.dueAmount || 0));
        case "date": {
          const tA = a.fechaPrestamo ? new Date(a.fechaPrestamo).getTime() : 0;
          const tB = b.fechaPrestamo ? new Date(b.fechaPrestamo).getTime() : 0;
          return factor * (tA - tB);
        }
        case "status": {
          const pA = (a.dueAmount || 0) <= 0 ? 1 : 0;
          const pB = (b.dueAmount || 0) <= 0 ? 1 : 0;
          return factor * (pA - pB);
        }
        case "name":
        default:
          return factor * collatorES.compare(a.name, b.name);
      }
    });
  }, [dateAndSearchCustomers, statusFilter, sortKey, sortDir]);

  React.useEffect(() => {
    setVisibleCount(48);
  }, [searchTerm, startDate, endDate, statusFilter, sortKey, sortDir]);

  const visibleCustomers = React.useMemo(
    () => filteredCustomers.slice(0, visibleCount),
    [filteredCustomers, visibleCount]
  );

  const summary = React.useMemo(() => {
    return filteredCustomers.reduce(
      (acc, customer) => {
        acc.totalLoaned += customer.loanAmount || 0;
        acc.totalDue += customer.dueAmount || 0;
        if ((customer.dueAmount || 0) <= 0) acc.paidCount += 1;
        return acc;
      },
      { totalLoaned: 0, totalDue: 0, paidCount: 0 }
    );
  }, [filteredCustomers]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() || startDate || endDate || statusFilter !== "all"
  );

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate(undefined);
    setEndDate(undefined);
    setStatusFilter("all");
  };

  const handleSort = (nextKey: CustomerSortKey) => {
    if (sortKey === nextKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDir(nextKey === "name" ? "asc" : "desc");
    }
  };

  const sortPresetValue = `${sortKey}:${sortDir}`;
  const handlePresetSortChange = (val: string) => {
    const [key, dir] = val.split(":") as [CustomerSortKey, SortDirection];
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
    if (!grupo || filteredCustomers.length === 0) return;
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF();
    doc.text(`Resumen del Grupo: ${grupo.name}`, 14, 16);
    doc.text(`Rango de Fechas: ${getDateRangeString()}`, 14, 22);
    doc.text(`Total Prestado: $${summary.totalLoaned.toLocaleString("es-MX")}`, 14, 28);
    doc.text(`Total Pendiente: $${summary.totalDue.toLocaleString("es-MX")}`, 14, 34);

    autoTable(doc, {
      startY: 40,
      head: [["Nombre", "Dirección", "Teléfono", "Aval", "Préstamo", "Saldo"]],
      body: filteredCustomers.map((c) => [
        c.name,
        c.address,
        c.phone,
        c.guarantor,
        `$${(c.loanAmount || 0).toLocaleString("es-MX")}`,
        `$${(c.dueAmount || 0).toLocaleString("es-MX")}`,
      ]),
    });
    const fileName = `Resumen_Grupo_${grupo.name.replace(/\s/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
    doc.save(fileName);
  };

  const exportToExcel = async () => {
    if (!grupo || filteredCustomers.length === 0) return;
    const XLSX = await import("xlsx");
    const dataToExport = filteredCustomers.map((c) => ({
      Nombre: c.name,
      Dirección: c.address,
      Teléfono: c.phone,
      Aval: c.guarantor,
      "Teléfono Aval": c.guarantorPhone,
      "Fecha Préstamo": c.fechaPrestamo ? format(new Date(c.fechaPrestamo), "yyyy-MM-dd") : "N/A",
      "Monto Prestado": c.loanAmount,
      "Saldo Pendiente": c.dueAmount,
    }));

    const worksheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(worksheet, [["Resumen de Clientes del Grupo"]], { origin: "A1" });
    XLSX.utils.sheet_add_aoa(worksheet, [[`Grupo: ${grupo.name}`]], { origin: "A2" });
    XLSX.utils.sheet_add_aoa(worksheet, [[`Rango de Fechas: ${getDateRangeString()}`]], { origin: "A3" });
    XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: "A5" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
    const fileName = `Resumen_Grupo_${grupo.name.replace(/\s/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  if (isLoading) {
    return <LoanControlSkeleton cards={6} showSummary />;
  }

  if (!grupo || !cartera || !plaza) {
    return (
      <div className="lc-surface p-8 text-center space-y-3">
        <p className="text-sm font-medium text-foreground">Información del grupo no encontrada.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/tools/loan-control">Volver a Control General</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <LoanControlBreadcrumbs
          items={[
            { label: "Control General", href: "/tools/loan-control" },
            { label: plaza.name, href: `/tools/loan-control/plaza/${plaza.id}` },
            { label: cartera.name, href: `/tools/loan-control/cartera/${cartera.id}` },
            { label: grupo.name },
          ]}
        />
        <NavPanel plazaId={plaza.id} />
      </div>

      <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-3 pb-4 border-b border-border">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{grupo.name}</h1>
          <p className="text-sm text-muted-foreground">
            Cartera <strong className="font-medium text-foreground">{cartera.name}</strong> · Plaza{" "}
            <strong className="font-medium text-foreground">{plaza.name}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                className="h-9 px-3.5 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 lc-pressable lc-touch-target"
              >
                <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Importar Clientes
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Importar Clientes a &ldquo;{grupo.name}&rdquo;</DialogTitle>
                <DialogDescriptionComponent>
                  Pega datos estructurados desde una hoja de cálculo. El sistema los procesará y asignará a este grupo.
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
                      htmlFor="r-add"
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg border p-3 text-xs font-medium cursor-pointer transition-colors",
                        importMode === "add"
                          ? "border-foreground/40 bg-muted/60 text-foreground"
                          : "border-border hover:bg-muted/30"
                      )}
                    >
                      <RadioGroupItem value="add" id="r-add" />
                      <span>Añadir a existentes</span>
                    </Label>
                    <Label
                      htmlFor="r-replace"
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg border p-3 text-xs font-medium cursor-pointer transition-colors",
                        importMode === "replace"
                          ? "border-rose-500/60 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                          : "border-border hover:bg-muted/30"
                      )}
                    >
                      <RadioGroupItem value="replace" id="r-replace" />
                      <span>Reemplazar clientes</span>
                    </Label>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="import-textarea" className="text-xs font-semibold text-foreground">
                    Datos de clientes
                  </Label>
                  <Textarea
                    id="import-textarea"
                    placeholder="Pega aquí las filas (Nombre, Dirección, Teléfono, Préstamo, Adeudo...)"
                    className="min-h-[180px]"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setImportModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleImport} disabled={isParsing || !importText.trim()}>
                  {isParsing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ClipboardPaste className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {isParsing ? "Procesando..." : "Importar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            disabled={filteredCustomers.length === 0}
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
            disabled={filteredCustomers.length === 0}
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
        loanedLabel="Total Prestado (Filtro)"
        dueLabel="Saldo Pendiente (Filtro)"
        secondaryMetric={{
          label: "Liquidados",
          value: `${summary.paidCount} de ${filteredCustomers.length}`,
          hint: getDateRangeString(),
        }}
      />

      <div className="lc-surface p-3 space-y-2.5">
        <div className="flex flex-col xl:flex-row gap-2.5 xl:items-center justify-between">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                aria-label="Buscar cliente por nombre, dirección o teléfono"
                placeholder="Buscar por nombre, dirección o teléfono..."
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
                    <CalendarIconLucide className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : <span>Fecha inicio</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={startDate} onSelect={setStartDate} locale={es} initialFocus />
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
                    <CalendarIconLucide className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : <span>Fecha fin</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={endDate} onSelect={setEndDate} locale={es} initialFocus />
                </PopoverContent>
              </Popover>

              <Select value={sortPresetValue} onValueChange={handlePresetSortChange}>
                <SelectTrigger aria-label="Ordenar clientes" className="w-[170px] h-9 text-xs">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name:asc">Nombre (A–Z)</SelectItem>
                  <SelectItem value="due:desc">Mayor saldo pendiente</SelectItem>
                  <SelectItem value="due:asc">Menor saldo pendiente</SelectItem>
                  <SelectItem value="loaned:desc">Mayor préstamo</SelectItem>
                  <SelectItem value="date:desc">Fecha más reciente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
          <div role="group" aria-label="Filtrar por estado de cuenta" className="inline-flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "all", label: "Todos", count: statusCounts.all },
                { id: "pending", label: "Pendientes", count: statusCounts.pending },
                { id: "paid", label: "Pagados", count: statusCounts.paid },
              ] as const
            ).map((pill) => {
              const active = statusFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(pill.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium lc-pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-foreground/30 bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  <span>{pill.label}</span>
                  <span
                    className={cn(
                      "rounded px-1 text-[11px] tabular-nums",
                      active ? "bg-background/20 text-background" : "bg-muted text-foreground/80"
                    )}
                  >
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground lc-pressable"
            >
              <FilterX className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      <div role="status" className="sr-only">
        Mostrando {visibleCustomers.length} de {filteredCustomers.length} clientes en {grupo.name}.
      </div>

      {filteredCustomers.length > 0 ? (
        <div className="space-y-4">
          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {visibleCustomers.map((customer) => (
                <CustomerInfoCard
                  key={customer.id}
                  customer={customer}
                  onEdit={(c) => handleOpenDialog(c, "edit")}
                  onPayment={(c) => handleOpenDialog(c, "payment")}
                />
              ))}
            </div>
          ) : (
            <div
              role="region"
              aria-label={`Tabla de clientes del grupo ${grupo.name}`}
              tabIndex={0}
              className="lc-surface overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <caption className="sr-only">Listado de clientes en {grupo.name}</caption>
                <thead className="sticky top-0 z-10 border-b border-border bg-muted/60 backdrop-blur-sm">
                  <tr>
                    <SortableHeaderCell columnKey="name" label="Cliente" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <th scope="col" className="h-10 px-3 text-left text-xs font-medium text-muted-foreground">
                      Contacto
                    </th>
                    <SortableHeaderCell columnKey="date" label="Fecha" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableHeaderCell columnKey="loaned" label="Préstamo" activeKey={sortKey} direction={sortDir} onSort={handleSort} align="right" />
                    <SortableHeaderCell columnKey="due" label="Saldo" activeKey={sortKey} direction={sortDir} onSort={handleSort} align="right" />
                    <SortableHeaderCell columnKey="status" label="Estado" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <th scope="col" className="h-10 px-3 text-right text-xs font-medium text-muted-foreground">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleCustomers.map((customer) => {
                    const isPaid = (customer.dueAmount || 0) <= 0;
                    const loaned = customer.loanAmount || 0;
                    const due = customer.dueAmount || 0;
                    return (
                      <tr key={customer.id} className="hover:bg-muted/40 transition-colors">
                        <th scope="row" className="px-3 py-3 text-left font-medium text-foreground">
                          <div className="min-w-[160px] max-w-[230px]">
                            <div className="truncate font-semibold text-foreground" title={customer.name}>
                              {customer.name}
                            </div>
                            <div className="truncate text-xs font-normal text-muted-foreground" title={customer.address}>
                              {customer.address || "Sin dirección"}
                            </div>
                          </div>
                        </th>
                        <td className="px-3 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {customer.phone || "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {customer.fechaPrestamo
                            ? format(new Date(customer.fechaPrestamo), "dd/MM/yyyy")
                            : "N/A"}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-foreground tabular-nums whitespace-nowrap">
                          {formatCurrency(loaned)}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap",
                            isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {formatCurrency(due)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <StatusBadge isPaid={isPaid} />
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(customer, "edit")}
                              aria-label={`Editar datos de ${customer.name}`}
                              className="h-8 px-2.5 text-xs lc-pressable"
                            >
                              <Pencil className="mr-1 h-3 w-3" aria-hidden="true" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={isPaid}
                              onClick={() => handleOpenDialog(customer, "payment")}
                              aria-label={isPaid ? `${customer.name} ya está liquidado` : `Registrar abono para ${customer.name}`}
                              className={cn(
                                "h-8 px-2.5 text-xs lc-pressable",
                                !isPaid &&
                                  "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                              )}
                            >
                              <DollarSign className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                              {isPaid ? "Liquidado" : "Abonar"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {visibleCount < filteredCustomers.length && (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVisibleCount((c) => c + 48)}
                className="h-9 px-4 text-xs font-medium lc-pressable tabular-nums"
              >
                Mostrar más clientes ({visibleCustomers.length} de {filteredCustomers.length})
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="lc-surface border-dashed p-10 flex flex-col items-center justify-center text-center gap-3">
          <Users className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <div className="space-y-1 max-w-md">
            <h2 className="text-sm font-semibold text-foreground">No se encontraron clientes</h2>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters
                ? "Prueba con otro término de búsqueda, estado o rango de fechas."
                : "No hay clientes asignados a este grupo todavía."}
            </p>
          </div>
          {hasActiveFilters && (
            <Button type="button" variant="outline" size="sm" onClick={clearFilters} className="lc-pressable">
              <FilterX className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Limpiar filtros
            </Button>
          )}
        </div>
      )}

      <CustomerEditDialog
        isOpen={!!selectedCustomer}
        customer={selectedCustomer}
        mode={dialogMode}
        onClose={handleCloseDialog}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
