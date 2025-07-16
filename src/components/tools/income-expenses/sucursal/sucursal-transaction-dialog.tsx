
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type SucursalTransactionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: 'expense' | 'deposit';
  onSubmit: (amount: number, description: string) => Promise<boolean>;
  currentBalance: number;
};

const dialogDetails = {
  expense: { title: "Registrar Gasto", description: "Registra una salida de dinero de la sucursal (ej. renta, servicios).", buttonText: "Registrar Gasto" },
  deposit: { title: "Registrar Depósito Interno", description: "Registra una entrada de dinero a la sucursal que no proviene del Capital Central (ej. recuperación de efectivo).", buttonText: "Registrar Depósito" },
};

export function SucursalTransactionDialog({ isOpen, onClose, mode, onSubmit, currentBalance }: SucursalTransactionDialogProps) {
  const [amount, setAmount] = React.useState<number | "">("");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const details = dialogDetails[mode];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof amount !== 'number' || amount <= 0) {
      setError("El monto debe ser un número positivo.");
      return;
    }
    if (!description.trim()) {
        setError("La descripción es requerida.");
        return;
    }
    if (mode === 'expense' && amount > currentBalance) {
      setError("No hay fondos suficientes en la sucursal para este gasto.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    
    const success = await onSubmit(amount, description);
    setIsSubmitting(false);

    if (success) {
      handleClose();
    }
  };
  
  const handleClose = () => {
    setAmount("");
    setDescription("");
    setError(null);
    onClose();
  }

  React.useEffect(() => {
    if(isOpen) {
        setAmount("");
        setDescription("");
        setError(null);
    }
  }, [isOpen, mode]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{details.title}</DialogTitle>
          <DialogDescription>{details.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="amount">Monto</Label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className="pl-9"
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                     <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Escribe un motivo claro para la transacción..."
                    />
                </div>
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {details.buttonText}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
