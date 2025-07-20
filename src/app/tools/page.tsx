import { ToolsManagement } from "@/components/tools/tools-management";
import type { Tool } from "@/lib/data";

export default function Tools({ customTools }: { customTools?: Tool[] }) {
  return <ToolsManagement customTools={customTools} />;
}
