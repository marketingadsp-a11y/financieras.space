
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, Send } from "lucide-react";
import type { Sucursal } from "@/lib/data";

type TransactionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: 'deposit' | 'withdrawal' | 'assignment';
  onSubmit: (amount: number, sucursalId?: string, description?: string) => Promise<boolean>;
  sucursales: Sucursal[];
  currentBalance: number;
};

const dialogDetails = {
  deposit: { title: "Ingresar Fondos", description: "Añadir dinero al Capital Central.", buttonText: "Ingresar" },
  withdrawal: { title: "Retirar Fondos", description: "Retirar dinero del Capital Central.", buttonText: "Retirar" },
  assignment: { title: "Asignar a Sucursal", description: "Transferir fondos del Capital Central a una sucursal.", buttonText: "Asignar" },
};

export function TransactionDialog({ isOpen, onClose, mode, onSubmit, sucursales, currentBalance }: TransactionDialogProps) {
  const [amount, setAmount] = React.useState<number | "">("");
  const [selectedSucursal, setSelectedSucursal] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const details = dialogDetails[mode];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof amount !== 'number' || amount <= 0) {
      setError("El monto debe ser un número positivo.");
      return;
    }
    if (mode === 'assignment' && !selectedSucursal) {
      setError("Debes seleccionar una sucursal.");
      return;
    }
     if ((mode === 'withdrawal' || mode === 'assignment') && amount > currentBalance) {
      setError("No hay fondos suficientes en el capital central.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    
    let description;
    if (mode === 'assignment') {
        const sucursalName = sucursales.find(s => s.id === selectedSucursal)?.name || "Desconocida";
        description = `Asignación a sucursal: ${sucursalName}`;
    }

    const success = await onSubmit(amount, selectedSucursal, description);
    setIsSubmitting(false);

    if (success) {
      handleClose();
    }
  };
  
  const handleClose = () => {
    setAmount("");
    setSelectedSucursal("");
    setError(null);
    onClose();
  }

  React.useEffect(() => {
    if(isOpen) {
        setAmount("");
        setSelectedSucursal("");
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
            {mode === 'assignment' && (
                <div className="space-y-2">
                <Label htmlFor="sucursal">Sucursal de Destino</Label>
                <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
                    <SelectTrigger id="sucursal">
                    <SelectValue placeholder="Selecciona una sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                    {sucursales.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                </div>
            )}
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
