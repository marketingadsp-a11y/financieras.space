
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type SucursalTransactionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (type: 'expense' | 'deposit' | 'transfer_to_loan_balance', amount: number, description: string) => Promise<boolean>;
  currentBalance: number;
};

export function SucursalTransactionDialog({ isOpen, onClose, onSubmit, currentBalance }: SucursalTransactionDialogProps) {
  const [mode, setMode] = React.useState<'deposit' | 'expense' | 'transfer_to_loan_balance'>('expense');
  const [amount, setAmount] = React.useState<number | "">("");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof amount !== 'number' || amount <= 0) {
      setError("El monto debe ser un número positivo.");
      return;
    }
    if (!description.trim() && mode !== 'transfer_to_loan_balance') {
        setError("La descripción es requerida para ingresos y gastos.");
        return;
    }
    if ((mode === 'expense' || mode === 'transfer_to_loan_balance') && amount > currentBalance) {
      setError("No hay fondos suficientes en la Caja Chica para esta operación.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    
    const finalDescription = mode === 'transfer_to_loan_balance' 
        ? `Transferencia a Caja de Préstamo` 
        : description;

    const success = await onSubmit(mode, amount, finalDescription);
    setIsSubmitting(false);

    if (success) {
      handleClose();
    }
  };
  
  const handleClose = () => {
    setAmount("");
    setDescription("");
    setError(null);
    setMode('expense'); // Reset mode
    onClose();
  }

  React.useEffect(() => {
    if(isOpen) {
        setAmount("");
        setDescription("");
        setError(null);
        setMode('expense');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Movimiento</DialogTitle>
          <DialogDescription>
            Registra un nuevo ingreso, gasto o transferencia para la sucursal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                <RadioGroup defaultValue="expense" value={mode} onValueChange={(value) => setMode(value as any)} className="grid grid-cols-3 gap-4">
                  <div>
                    <RadioGroupItem value="expense" id="r-expense" className="peer sr-only" />
                    <Label htmlFor="r-expense" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-destructive [&:has([data-state=checked])]:border-destructive">
                      Gasto
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="deposit" id="r-deposit" className="peer sr-only" />
                    <Label htmlFor="r-deposit" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                      Ingreso
                    </Label>
                  </div>
                   <div>
                    <RadioGroupItem value="transfer_to_loan_balance" id="r-transfer" className="peer sr-only" />
                    <Label htmlFor="r-transfer" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-500 [&:has([data-state=checked])]:border-blue-500">
                      Transferir
                    </Label>
                  </div>
                </RadioGroup>
                
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
                {mode !== 'transfer_to_loan_balance' && (
                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={`Ej. ${mode === 'expense' ? 'Pago de renta' : 'Venta del día'}`}
                        />
                    </div>
                )}
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Registrar Movimiento
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
