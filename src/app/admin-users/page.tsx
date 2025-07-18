"use client";

import { AdminUsersManagement } from "@/components/users/admin-users-management";
import { getCustomizedTools } from "@/lib/data";

export default function AdminUsersPage() {
    const customTools = getCustomizedTools();
    return <AdminUsersManagement customTools={customTools} />;
}
