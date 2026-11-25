"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Building,
  FileText,
  FileSpreadsheet,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import type { Plaza } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { getPlazas } from "@/services/plaza-service";
import { getCachedOrFetch } from "@/lib/client-cache";
import { cn } from "@/lib/utils";
import { collatorES, formatCurrency } from "./loan-control-ui";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";

export function LoanControlSidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [plazas, setPlazas] = React.useState<Plaza[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [exportingType, setExportingType] = React.useState<"pdf" | "excel" | null>(null);

  const fetchNavData = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const shouldFetchAll = user.isSuperAdmin || user.isToolAdmin;
      const cacheKey = `loan-control-plazas:${shouldFetchAll ? "all" : user.prefix || ""}`;
      const fetchedPlazas = await getCachedOrFetch(cacheKey, () =>
        getPlazas({ prefix: user.prefix, fetchAll: shouldFetchAll, toolContext: "loan-control" })
      );
      setPlazas([...fetchedPlazas].sort((a, b) => collatorES.compare(a.name, b.name)));
    } catch (error) {
      console.error("Failed to fetch loan control nav plazas", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchNavData();
    const handleUpdate = () => {
      fetchNavData();
    };
    window.addEventListener("loan-control-updated", handleUpdate);
    return () => window.removeEventListener("loan-control-updated", handleUpdate);
  }, [fetchNavData]);

  const filteredPlazas = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return plazas;
    return plazas.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.prefix || "").toLowerCase().includes(query)
    );
  }, [plazas, searchTerm]);

  const totals = React.useMemo(() => {
    let totalLoaned = 0;
    let totalDue = 0;
    let activeCount = 0;
    for (const p of plazas) {
      const loaned = p.totalLoanAmount || 0;
      const due = p.pendingDebt || 0;
      totalLoaned += loaned;
      totalDue += due;
      if (loaned > 0 || due > 0) activeCount += 1;
    }
    return { totalLoaned, totalDue, activeCount };
  }, [plazas]);

  const exportToPDF = async () => {
    if (plazas.length === 0 || exportingType) return;
    setExportingType("pdf");
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const activePlazas = plazas.filter(
        (p) => (p.totalLoanAmount || 0) > 0 || (p.pendingDebt || 0) > 0
      );
      const inactivePlazas = plazas.filter(
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
      doc.text(`Emisión Global: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 20, 31);

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
      doc.text(`${activePlazas.length} de ${plazas.length}`, 14 + cardWidth * 2 + 12, cardY + 14);

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
    } finally {
      setExportingType(null);
    }
  };

  const exportToExcel = async () => {
    if (plazas.length === 0 || exportingType) return;
    setExportingType("excel");
    try {
      const XLSX = await import("xlsx");
      const dataToExport = plazas.map((p) => ({
        Plaza: p.name,
        Prefijo: p.prefix,
        "Total Prestado": p.totalLoanAmount,
        "Deuda Pendiente": p.pendingDebt,
      }));

      const worksheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.sheet_add_aoa(worksheet, [["Resumen Global de Plazas - Control de Préstamo"]], {
        origin: "A1",
      });
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[`Fecha de Emisión: ${format(new Date(), "dd/MM/yyyy HH:mm")}`]],
        { origin: "A2" }
      );
      XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: "A4" });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Resumen de Plazas");
      const fileName = `Resumen_Global_Control_Prestamo_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } finally {
      setExportingType(null);
    }
  };

  const isDashboardActive = pathname === "/tools/loan-control";

  return (
    <>
      <SidebarGroup className="gap-1">
        <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-sidebar-foreground/55 uppercase">
          Control de Préstamos
        </SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isDashboardActive}
              tooltip="Control General"
              className="h-9 rounded-lg font-medium lc-pressable"
            >
              <Link href="/tools/loan-control">
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                <span>Control General</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarSeparator />

      <SidebarGroup className="gap-2">
        <div className="flex items-center justify-between px-2 group-data-[collapsible=icon]:hidden">
          <span className="text-[11px] font-semibold tracking-wider text-sidebar-foreground/55 uppercase">
            Plazas
          </span>
          {!isLoading && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-sidebar-foreground/80 tabular-nums">
              {plazas.length}
            </span>
          )}
        </div>

        {!isLoading && plazas.length > 5 && (
          <div className="px-2 group-data-[collapsible=icon]:hidden">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/45"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar plaza..."
                aria-label="Filtrar plazas en el menú"
                className="h-8 w-full rounded-lg border border-sidebar-border bg-white/[0.04] pl-8 pr-7 text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Limpiar filtro de plazas"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-sidebar-foreground/55 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-1.5 px-2" aria-busy="true" aria-label="Cargando plazas">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-8 rounded-lg bg-white/[0.06] animate-pulse motion-reduce:animate-none group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
              />
            ))}
          </div>
        ) : filteredPlazas.length > 0 ? (
          <SidebarMenu className="max-h-[32vh] overflow-y-auto overscroll-contain scroll-premium pr-0.5">
            {filteredPlazas.map((plaza) => {
              const isPlazaActive =
                pathname === `/tools/loan-control/plaza/${plaza.id}` ||
                pathname.startsWith(`/tools/loan-control/plaza/${plaza.id}/`);
              const due = plaza.pendingDebt || 0;

              return (
                <SidebarMenuItem key={plaza.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={isPlazaActive}
                    tooltip={`${plaza.name} (${formatCurrency(due)})`}
                    className="h-8 rounded-lg lc-pressable justify-between"
                  >
                    <Link href={`/tools/loan-control/plaza/${plaza.id}`}>
                      <span className="flex items-center gap-2 min-w-0">
                        <Building className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
                        <span className="truncate text-xs">{plaza.name}</span>
                      </span>
                      <span
                        className={cn(
                          "ml-2 shrink-0 text-[11px] font-medium tabular-nums group-data-[collapsible=icon]:hidden",
                          due > 0 ? "text-rose-400" : "text-emerald-400"
                        )}
                      >
                        {formatCurrency(due)}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        ) : (
          <p className="px-3 py-2 text-xs text-sidebar-foreground/55 group-data-[collapsible=icon]:hidden">
            {searchTerm ? "Sin coincidencias." : "Sin plazas registradas."}
          </p>
        )}
      </SidebarGroup>

      <div className="px-2 py-1 space-y-2.5 group-data-[collapsible=icon]:hidden">
        <div className="rounded-xl border border-sidebar-border bg-white/[0.03] p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-sidebar-foreground/60 uppercase">
              Resumen Global
            </span>
            <span className="text-[11px] text-sidebar-foreground/60 tabular-nums">
              {totals.activeCount}/{plazas.length} act.
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5">
              <span className="text-xs text-sidebar-foreground/75">Prestado</span>
              <span className="text-xs font-semibold text-sidebar-foreground tabular-nums">
                {formatCurrency(totals.totalLoaned)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5">
              <span className="text-xs text-sidebar-foreground/75">Pendiente</span>
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  totals.totalDue > 0 ? "text-rose-400" : "text-emerald-400"
                )}
              >
                {formatCurrency(totals.totalDue)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-sidebar-border bg-white/[0.03] p-3 space-y-2">
          <span className="block text-[11px] font-semibold tracking-wider text-sidebar-foreground/60 uppercase">
            Reportes Rápidos
          </span>

          <div className="grid grid-cols-1 gap-1.5">
            <button
              type="button"
              onClick={exportToPDF}
              disabled={plazas.length === 0 || exportingType !== null}
              className="w-full flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-2 text-left text-sidebar-foreground hover:bg-white/[0.09] hover:border-white/15 disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring lc-pressable"
            >
              {exportingType === "pdf" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-rose-400" aria-hidden="true" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium leading-tight">Exportar PDF</div>
                <div className="text-[11px] text-sidebar-foreground/55 truncate">Reporte ejecutivo</div>
              </div>
            </button>

            <button
              type="button"
              onClick={exportToExcel}
              disabled={plazas.length === 0 || exportingType !== null}
              className="w-full flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-2 text-left text-sidebar-foreground hover:bg-white/[0.09] hover:border-white/15 disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring lc-pressable"
            >
              {exportingType === "excel" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-400" aria-hidden="true" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium leading-tight">Exportar Excel</div>
                <div className="text-[11px] text-sidebar-foreground/55 truncate">Detalle de plazas</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
