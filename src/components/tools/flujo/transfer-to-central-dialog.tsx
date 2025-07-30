
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";

type TransferToCentralDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<boolean>;
  maxAmount: number;
};

export function TransferToCentralDialog({ isOpen, onClose, onSubmit, maxAmount }: TransferToCentralDialogProps) {
  const [amount, setAmount] = React.useState<number | undefined>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (typeof amount !== 'number' || amount <= 0) {
      setError("El monto debe ser un número positivo.");
      return;
    }
    if (amount > maxAmount) {
        setError("No hay suficiente efectivo para esta transferencia.");
        return;
    }

    setIsSubmitting(true);
    const success = await onSubmit(amount);
    setIsSubmitting(false);

    if (success) {
      handleClose();
    }
  };
  
  const handleClose = () => {
    setAmount(undefined);
    setError(null);
    onClose();
  }

  React.useEffect(() => {
    if (!isOpen) {
        handleClose();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir Efectivo a Caja Chica</DialogTitle>
          <DialogDescription>
            El monto que especifiques se restará del "Total Efectivo" de esta sucursal y se sumará a la "Caja Chica" central.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="amount">Monto a Transferir</Label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <CurrencyInput
                            id="amount"
                            value={amount}
                            onValueChange={setAmount}
                            className="pl-9"
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">Efectivo disponible: ${maxAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                </div>
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Transferencia
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
