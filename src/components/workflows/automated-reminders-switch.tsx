"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export function AutomatedRemindersSwitch() {
  const [isEnabled, setIsEnabled] = useState(true);
  const { toast } = useToast();

  const handleToggle = (checked: boolean) => {
    setIsEnabled(checked);
    toast({
      title: "Configuración Actualizada",
      description: `Los recordatorios automáticos han sido ${checked ? "habilitados" : "deshabilitados"}.`,
    });
  };

  return <Switch checked={isEnabled} onCheckedChange={handleToggle} aria-label="Alternar recordatorios automáticos" />;
}
