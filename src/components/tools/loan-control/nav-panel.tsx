"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Folders, Users } from "lucide-react";

export const NavPanel = ({ plazaId }: { plazaId: string }) => {
    const pathname = usePathname();
    const basePath = `/tools/loan-control`;

    const navItems = [
        { href: basePath, label: 'Control General', icon: LayoutGrid, active: pathname === basePath },
        { href: `${basePath}/plaza/${plazaId}`, label: 'Carteras', icon: Folders, active: pathname.includes(`/plaza/${plazaId}`) && !pathname.endsWith('/grupos') },
        { href: `${basePath}/plaza/${plazaId}/grupos`, label: 'Grupos', icon: Users, active: pathname.endsWith('/grupos') },
    ];

    return (
        <div className="glassmorphic rounded-xl p-1 border border-white/25 dark:border-slate-800/40 shadow-lg shadow-slate-100/10 dark:shadow-none flex flex-row items-center justify-between gap-1 w-full max-w-md mx-auto mb-3">
            {navItems.map(item => (
                <Link 
                    key={item.label} 
                    href={item.href}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                        item.active 
                            ? "bg-gradient-to-r from-primary to-indigo-650 text-white shadow-md shadow-primary/20 scale-[1.01]" 
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/30"
                    }`}
                >
                    <item.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{item.label}</span>
                </Link>
            ))}
        </div>
    );
};
