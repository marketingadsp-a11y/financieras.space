
"use client";

import { UsersManagement } from "@/components/users/users-management";
import { getCustomizedTools } from "@/lib/data";

export default function UsersSettingsPage() {
  const customTools = getCustomizedTools();
  // This page will now only manage PlazaUsers for the "Cartera Vencida" tool.
  // Tool-specific users are managed within their respective tool sections.
  return <UsersManagement customTools={customTools} />;
}
