
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { OficinaMensual, ClienteMensual, InterestRate } from "@/lib/data";
import { getOficinas, getClientes, addCliente, addPaymentToCliente } from "@/services/mensuales-service";
import { getInterestRates } from "@/services/interest-rate-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, DollarSign, Search } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ClientesTable } from "./clientes-table";
import { PrestamoForm } from "./prestamo-form";
import { PagoForm } from "./pago-form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function MensualesDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [oficinas, setOficinas] = React.useState<OficinaMensual[]>([]);
  const [interestRates, setInterestRates] = React.useState<InterestRate[]>([]);
  const [clientes, setClientes] = React.useState<ClienteMensual[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isPrestamoFormOpen, setIsPrestamoFormOpen] = React.useState(false);
  const [isPagoFormOpen, setIsPagoFormOpen] = React.useState(false);
  const [selectedCliente, setSelectedCliente] = React.useState<ClienteMensual | null>(null);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedOficina, setSelectedOficina] = React.useState("all");

  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [oficinasData, clientesData, ratesData] = await Promise.all([
        getOficinas(user.prefix),
        getClientes(user.prefix),
        getInterestRates(user.prefix),
      ]);
      setOficinas(oficinasData);
      setClientes(clientesData);
      setInterestRates(ratesData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddPrestamo = async (prestamoData: Omit<ClienteMensual, 'id' | 'prefix' | 'currentBalance' | 'status' | 'interestRateValue'>) => {
    if (!user?.prefix) return;
    
    const selectedRate = interestRates.find(r => r.id === prestamoData.interestRateId);
    if (!selectedRate) {
        toast({ variant: "destructive", title: "Error", description: "La tasa de interés seleccionada no es válida." });
        return;
    }

    try {
      const dataToSave = {
        ...prestamoData,
        prefix: user.prefix,
        currentBalance: prestamoData.loanAmount,
        interestRateValue: selectedRate.value,
        status: 'vigente' as const,
      };
      await addCliente(dataToSave);
      toast({ title: "Éxito", description: "Préstamo registrado correctamente." });
      setIsPrestamoFormOpen(false);
      fetchData(); // Refresh data
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo registrar el préstamo." });
    }
  };
  
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

  const oficinaMap = React.useMemo(() => new Map(oficinas.map(o => [o.id, o.name])), [oficinas]);

  const filteredAndSortedClientes = React.useMemo(() => {
    return clientes
      .filter(cliente => {
        const searchTermLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || cliente.name.toLowerCase().includes(searchTermLower) || cliente.displayId?.includes(searchTermLower);
        
        const matchesOficina = selectedOficina === 'all' || cliente.oficinaId === selectedOficina;

        return matchesSearch && matchesOficina;
      })
      .sort((a, b) => {
        const oficinaA = oficinaMap.get(a.oficinaId) || '';
        const oficinaB = oficinaMap.get(b.oficinaId) || '';
        if (oficinaA < oficinaB) return -1;
        if (oficinaA > oficinaB) return 1;
        
        // If offices are the same, sort by client name
        return a.name.localeCompare(b.name);
      });
  }, [clientes, searchTerm, selectedOficina, oficinaMap]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Préstamos Mensuales</h1>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isPrestamoFormOpen} onOpenChange={setIsPrestamoFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Registrar Préstamo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Préstamo</DialogTitle>
                <DialogDescription>
                  Completa los datos para registrar un nuevo cliente y su préstamo.
                </DialogDescription>
              </DialogHeader>
              <PrestamoForm 
                oficinas={oficinas}
                interestRates={interestRates}
                onSubmit={handleAddPrestamo}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Préstamos Registrados</CardTitle>
              <CardDescription>Lista de todos los préstamos activos y liquidados.</CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente o ID..."
                  className="pl-8 sm:w-[200px] md:w-[250px] lg:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedOficina} onValueChange={setSelectedOficina}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filtrar por oficina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las oficinas</SelectItem>
                  {oficinas.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="mr-2 h-8 w-8 animate-spin" />
              <span>Cargando préstamos...</span>
            </div>
          ) : (
            <ClientesTable data={filteredAndSortedClientes} oficinas={oficinas} onPaymentClick={handleOpenPagoForm}/>
          )}
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
