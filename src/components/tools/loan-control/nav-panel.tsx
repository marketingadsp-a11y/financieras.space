"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Folders, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const NavPanel = ({ plazaId }: { plazaId: string }) => {
  const pathname = usePathname();
  const basePath = "/tools/loan-control";

  const navItems = [
    {
      href: basePath,
      label: "Control General",
      shortLabel: "General",
      icon: LayoutGrid,
      active: pathname === basePath,
    },
    {
      href: `${basePath}/plaza/${plazaId}`,
      label: "Carteras",
      shortLabel: "Carteras",
      icon: Folders,
      active: pathname.startsWith(`${basePath}/plaza/${plazaId}`) && !pathname.endsWith("/grupos"),
    },
    {
      href: `${basePath}/plaza/${plazaId}/grupos`,
      label: "Grupos",
      shortLabel: "Grupos",
      icon: Users,
      active: pathname.endsWith("/grupos"),
    },
  ];

  return (
    <nav
      aria-label="Secciones de la plaza"
      className="lc-surface inline-flex w-full sm:w-auto items-center gap-1 p-1 bg-muted/50"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "relative flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium lc-pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              item.active
                ? "bg-background text-foreground shadow-sm font-semibold after:content-[''] after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:rounded-full after:bg-foreground/80"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="sm:hidden">{item.shortLabel}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
