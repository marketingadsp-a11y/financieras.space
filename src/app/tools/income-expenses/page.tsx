
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { IncomeExpensesDashboard } from "@/components/tools/income-expenses/income-expenses-dashboard";
import { SucursalDashboard } from "@/components/tools/income-expenses/sucursal-dashboard";
import { Loader2 } from "lucide-react";

export default function IncomeExpensesPage() {
    const { user, loading } = useAuth();

    if (loading || !user) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Cargando...</span>
            </div>
        );
    }
    
    // Check if the user is a ToolAdmin with specific branch access
    const isBranchUser = user.isToolAdmin && user.sucursalAccess && user.sucursalAccess.length > 0;

    if (isBranchUser) {
        return <SucursalDashboard />;
    }
    
    // Otherwise, show the full admin dashboard
    return <IncomeExpensesDashboard />;
}
