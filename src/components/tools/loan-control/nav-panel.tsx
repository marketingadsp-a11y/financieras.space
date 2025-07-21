
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Building, Folders, Users } from "lucide-react";

export const NavPanel = ({ plazaId }: { plazaId: string }) => {
    const pathname = usePathname();
    const basePath = `/tools/loan-control`;

    const navItems = [
        { href: basePath, label: 'Control General', icon: LayoutGrid, active: pathname === basePath },
        { href: `${basePath}/plaza/${plazaId}`, label: 'Carteras', icon: Folders, active: pathname.includes(`/plaza/${plazaId}`) && !pathname.endsWith('/grupos') },
        { href: `${basePath}/plaza/${plazaId}/grupos`, label: 'Grupos', icon: Users, active: pathname.endsWith('/grupos') },
    ];

    return (
        <Card>
            <CardContent className="p-2">
                <div className="flex flex-wrap items-center justify-center gap-2">
                    {navItems.map(item => (
                         <Button key={item.label} variant={item.active ? 'default' : 'ghost'} asChild className="flex-1 min-w-[150px] transition-all duration-200">
                             <Link href={item.href}>
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.label}
                            </Link>
                         </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
