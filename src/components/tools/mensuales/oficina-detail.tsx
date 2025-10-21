
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { OficinaMensual, ClienteMensual } from "@/lib/data";
import { getOficinaById, getClientes, addPaymentToCliente } from "@/services/mensuales-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ClientesTable } from "./clientes-table";
import { PagoForm } from "./pago-form";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export function OficinaDetailPanel({ oficinaId }: { oficinaId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [oficina, setOficina] = React.useState<OficinaMensual | null>(null);
  const [clientes, setClientes] = React.useState<ClienteMensual[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isPagoFormOpen, setIsPagoFormOpen] = React.useState(false);
  const [selectedCliente, setSelectedCliente] = React.useState<ClienteMensual | null>(null);

  const [searchTerm, setSearchTerm] = React.useState("");

  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const [oficinaData, allClientesData] = await Promise.all([
        getOficinaById(oficinaId),
        getClientes(user.prefix),
      ]);
      setOficina(oficinaData);
      setClientes(allClientesData.filter(c => c.oficinaId === oficinaId));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos de la oficina.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [oficinaId, toast, user?.prefix]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleOpenPagoForm = (cliente: ClienteMensual) => {
    setSelectedCliente(cliente);
    setIsPagoFormOpen(true);
  }
  
  const handlePaymentSubmit = async (amount: number) => {
    if (!selectedCliente) return;

    try {
        await addPaymentToCliente(selectedCliente.id, amount);
        toast({ title: "Éxito", description: "Abono registrado correctamente." });
        setIsPagoFormOpen(false);
        setSelectedCliente(null);
        fetchData();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo registrar el abono." });
    }
  };

  const filteredAndSortedClientes = React.useMemo(() => {
    return clientes
      .filter(cliente => {
        const searchTermLower = searchTerm.toLowerCase();
        return !searchTerm || cliente.name.toLowerCase().includes(searchTermLower) || cliente.displayId?.toString().includes(searchTermLower);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clientes, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando datos de la oficina...</span>
      </div>
    );
  }
  
  if (!oficina) {
      return (
          <div className="text-center">
              <h2 className="text-xl font-semibold">Oficina no encontrada</h2>
              <Button asChild variant="link"><Link href="/tools/mensuales">Volver al Dashboard</Link></Button>
          </div>
      )
  }

  return (
    <div className="space-y-6">
       <Button variant="outline" asChild>
            <Link href="/tools/mensuales">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
            </Link>
        </Button>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Préstamos Registrados: {oficina.name}</CardTitle>
              <CardDescription>Lista de todos los préstamos para esta oficina.</CardDescription>
            </div>
            <div className="relative flex-grow max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente o ID..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ClientesTable data={filteredAndSortedClientes} oficinas={[oficina]} onPaymentClick={handleOpenPagoForm}/>
        </CardContent>
      </Card>
      
      <Dialog open={isPagoFormOpen} onOpenChange={setIsPagoFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Registrar Abono para {selectedCliente?.name}</DialogTitle>
                 <DialogDescription>
                    El interés total a cubrir se pagará primero. El resto se irá a capital.
                </DialogDescription>
            </DialogHeader>
            <PagoForm cliente={selectedCliente} onSubmit={handlePaymentSubmit}/>
        </DialogContent>
      </Dialog>
    </div>
  );
}
