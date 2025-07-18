
"use client";

import { UsersManagement } from "@/components/users/users-management";
import { getCustomizedTools } from "@/lib/data";

export default function UsersSettingsPage() {
  const customTools = getCustomizedTools();
  return <UsersManagement customTools={customTools} />;
}
