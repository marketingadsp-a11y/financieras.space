"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, LayoutGrid, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const collatorES = new Intl.Collator("es", {
  numeric: true,
  sensitivity: "base",
});

export function formatCurrency(value: number | undefined | null, decimals = 0): string {
  const numeric = Number.isFinite(value) ? Number(value) : 0;
  return `$${numeric.toLocaleString("es-MX", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function LoanControlBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Ruta de Control de Préstamos" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-1 min-w-0">
              {idx > 0 && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="truncate max-w-[180px] rounded px-1 py-0.5 font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lc-pressable"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="truncate max-w-[220px] px-1 py-0.5 font-semibold text-foreground"
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export type PortfolioSummaryBarProps = {
  totalLoaned: number;
  totalDue: number;
  loanedLabel?: string;
  dueLabel?: string;
  secondaryMetric?: {
    label: string;
    value: string;
    hint?: string;
  };
};

export function PortfolioSummaryBar({
  totalLoaned,
  totalDue,
  loanedLabel = "Total Prestado",
  dueLabel = "Saldo Pendiente",
  secondaryMetric,
}: PortfolioSummaryBarProps) {
  return (
    <section
      aria-label="Resumen financiero"
      className="lc-surface overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border"
    >
      <div className="p-4 sm:p-5 flex flex-col justify-between gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">{loanedLabel}</span>
          {secondaryMetric && (
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {secondaryMetric.label}: <strong className="text-foreground font-semibold">{secondaryMetric.value}</strong>
            </span>
          )}
        </div>
        <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
          {formatCurrency(totalLoaned, 2)}
        </p>
        {secondaryMetric?.hint && (
          <p className="text-xs text-muted-foreground tabular-nums">{secondaryMetric.hint}</p>
        )}
      </div>

      <div className="p-4 sm:p-5 flex flex-col justify-between gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">{dueLabel}</span>
        <p
          className={cn(
            "text-2xl font-semibold tracking-tight tabular-nums",
            totalDue > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {formatCurrency(totalDue, 2)}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {totalDue > 0 ? "Por recuperar de cartera activa" : "Sin adeudo pendiente"}
        </p>
      </div>
    </section>
  );
}

export type ViewMode = "cards" | "table";

export function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Modo de visualización"
      className="inline-flex items-center rounded-lg border border-border bg-muted/60 p-0.5 shrink-0"
    >
      <button
        type="button"
        aria-pressed={value === "cards"}
        onClick={() => onChange("cards")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium lc-pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          value === "cards"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Tarjetas</span>
      </button>
      <button
        type="button"
        aria-pressed={value === "table"}
        onClick={() => onChange("table")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium lc-pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          value === "table"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Tabla</span>
      </button>
    </div>
  );
}

export type SortDirection = "asc" | "desc";

export function SortableHeaderCell<K extends string>({
  columnKey,
  label,
  activeKey,
  direction,
  onSort,
  align = "left",
  className,
}: {
  columnKey: K;
  label: string;
  activeKey: K;
  direction: SortDirection;
  onSort: (key: K) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const isActive = activeKey === columnKey;
  return (
    <th
      scope="col"
      aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : undefined}
      className={cn(
        "h-10 p-0 text-xs font-medium text-muted-foreground select-none whitespace-nowrap",
        align === "right" ? "text-right" : "text-left",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={cn(
          "flex h-full w-full items-center gap-1.5 px-3 py-2 font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          align === "right" ? "justify-end" : "justify-start",
          isActive && "text-foreground font-semibold"
        )}
      >
        <span>{label}</span>
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden="true" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 shrink-0 opacity-45" aria-hidden="true" />
        )}
      </button>
    </th>
  );
}

export function LoanControlSkeleton({ cards = 8, showSummary = true }: { cards?: number; showSummary?: boolean }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Cargando información">
      <div className="flex flex-col sm:flex-row justify-between gap-3 pb-4 border-b border-border">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {showSummary && (
        <div className="lc-surface grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          {[0, 1].map((i) => (
            <div key={i} className="p-5 space-y-2.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-2.5 w-32" />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, idx) => (
          <div key={idx} className="lc-surface p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Skeleton className="h-12 rounded-md" />
              <Skeleton className="h-12 rounded-md" />
            </div>
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
