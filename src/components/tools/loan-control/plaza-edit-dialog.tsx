
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { Plaza } from "@/lib/data";

type PlazaEditDialogProps = {
  plaza: Plaza | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, newName: string) => Promise<boolean>;
};

export function PlazaEditDialog({ plaza, isOpen, onClose, onSave }: PlazaEditDialogProps) {
  const [name, setName] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (plaza) {
      setName(plaza.name);
    }
  }, [plaza]);

  const handleSave = async () => {
    if (!plaza || !name.trim()) return;
    setIsSaving(true);
    const success = await onSave(plaza.id, name);
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Nombre de la Plaza</DialogTitle>
          <DialogDescription>
            Estás a punto de cambiar el nombre de la plaza "{plaza?.name}".
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="plaza-name">Nuevo nombre de la plaza</Label>
          <Input
            id="plaza-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
