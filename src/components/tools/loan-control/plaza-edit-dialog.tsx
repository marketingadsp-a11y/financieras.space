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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plaza || !name.trim()) return;
    setIsSaving(true);
    const success = await onSave(plaza.id, name.trim());
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Nombre de la Plaza</DialogTitle>
          <DialogDescription>
            Cambia el nombre visible para <strong>{plaza?.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2 py-2">
            <Label htmlFor="plaza-name" className="text-xs font-semibold text-foreground">
              Nuevo nombre de la plaza
            </Label>
            <Input
              id="plaza-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la plaza"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="lc-pressable">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 lc-pressable"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
