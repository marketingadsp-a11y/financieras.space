
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
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { Sucursal } from "@/lib/data";
import { CurrencyInput } from "@/components/ui/currency-input";

type AdjustBalanceDialogProps = {
  sucursal: Sucursal | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (sucursalId: string, newBalance: number) => Promise<boolean>;
};

export function AdjustBalanceDialog({ sucursal, isOpen, onClose, onSave }: AdjustBalanceDialogProps) {
  const [newBalance, setNewBalance] = React.useState<number | undefined>();
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (sucursal) {
      setNewBalance(sucursal.currentBalance);
    }
  }, [sucursal]);

  const handleSave = async () => {
    if (!sucursal || typeof newBalance !== 'number') return;
    setIsSaving(true);
    const success = await onSave(sucursal.id, newBalance);
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
          <DialogTitle>Ajustar Saldo de Caja Chica</DialogTitle>
          <DialogDescription>
            Estás editando el saldo de la sucursal: <span className="font-semibold">{sucursal?.name}</span>.
            Esta acción no crea un registro de transacción.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="new-balance">Nuevo Saldo</Label>
           <CurrencyInput
            id="new-balance"
            value={newBalance}
            onValueChange={setNewBalance}
            placeholder="0.00"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-1">Saldo actual: ${(sucursal?.currentBalance || 0).toLocaleString()}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving || typeof newBalance !== 'number'}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Nuevo Saldo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
