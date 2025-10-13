
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { OficinaMensual, ClienteMensual, InterestRate } from "@/lib/data";
import { getOficinas, getClientes, addCliente, addPaymentToCliente } from "@/services/mensuales-service";
import { getInterestRates } from "@/services/interest-rate-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, DollarSign, Search, FileDown } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ClientesTable } from "./clientes-table";
import { PrestamoForm } from "./prestamo-form";
import { PagoForm } from "./pago-form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportDialog } from "./export-dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

  const [isExportDialogOpen, setIsExportDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

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

  const handleAddPrestamo = async (prestamoData: Omit<ClienteMensual, 'id' | 'prefix' | 'currentBalance' | 'status' | 'interestRateValue' | 'monthlyInterestCharge'>) => {
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

  const handleExport = async (oficinaId: string, formatType: 'pdf' | 'excel') => {
    setIsExporting(true);
    try {
        let clientesToExport = oficinaId === 'all' 
            ? clientes 
            : clientes.filter(c => c.oficinaId === oficinaId);
        
        if (clientesToExport.length === 0) {
            toast({ title: "Sin datos", description: "No hay clientes para exportar con los filtros seleccionados."});
            setIsExporting(false);
            return;
        }

        const oficinaName = oficinaId === 'all' ? 'Todas' : oficinas.find(o => o.id === oficinaId)?.name || 'Desconocida';
        const localOficinaMap = new Map(oficinas.map(o => [o.id, o.name]));

        // Sort the data before exporting
        clientesToExport = clientesToExport.sort((a, b) => {
            const oficinaA = localOficinaMap.get(a.oficinaId) || 'zzzz';
            const oficinaB = localOficinaMap.get(b.oficinaId) || 'zzzz';
            if (oficinaA < oficinaB) return -1;
            if (oficinaA > oficinaB) return 1;
            return a.name.localeCompare(b.name);
        });

        if (formatType === 'pdf') {
            generatePDF(clientesToExport, oficinaName);
        } else {
            generateExcel(clientesToExport, oficinaName);
        }
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo generar el reporte." });
    } finally {
        setIsExporting(false);
        setIsExportDialogOpen(false);
    }
  };

  const generatePDF = (data: ClienteMensual[], oficinaName: string) => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    const totalClients = data.length;
    const totalLoaned = data.reduce((sum, c) => sum + c.loanAmount, 0);
    const totalDue = data.reduce((sum, c) => sum + c.currentBalance, 0);

    // Header
    const drawHeader = () => {
        doc.setFillColor(22, 163, 74); // bg-emerald-600
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text("Reporte de Préstamos Mensuales", 14, 20);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Oficina: ${oficinaName}`, 14, 28);
        doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - 14, 28, { align: 'right' });
    };

    drawHeader();
    
    // Summary
    autoTable(doc, {
        startY: 45,
        body: [
            [{ content: 'CLIENTES TOTALES', styles: { fontStyle: 'bold', fillColor: [244, 244, 245] } }, totalClients],
            [{ content: 'MONTO TOTAL PRESTADO', styles: { fontStyle: 'bold', fillColor: [244, 244, 245] } }, `$${totalLoaned.toLocaleString('es-MX', {minimumFractionDigits:2})}`],
            [{ content: 'SALDO TOTAL PENDIENTE', styles: { fontStyle: 'bold', fillColor: [244, 244, 245] } }, `$${totalDue.toLocaleString('es-MX', {minimumFractionDigits:2})}`],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 1: { halign: 'right' } }
    });

    // Table
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['ID', 'Cliente', 'Oficina', 'Estado', 'Monto Prestado', 'Saldo Actual', 'Tasa', 'Día Pago']],
        body: data.map(c => {
            const monthlyInterest = (c.currentBalance * c.interestRateValue) / 100;
            return [
                c.displayId,
                c.name,
                oficinas.find(o => o.id === c.oficinaId)?.name || 'N/A',
                c.status,
                `$${c.loanAmount.toLocaleString('es-MX')}`,
                `$${c.currentBalance.toLocaleString('es-MX')}`,
                `${c.interestRateValue}%`,
                c.paymentDay
            ];
        }),
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }, // A nice blue for headers
        styles: { fontSize: 8 },
        didDrawPage: (data) => {
            // Footer
            const pageCount = doc.internal.pages.length;
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${data.pageNumber} de ${doc.internal.pages.length}`, data.settings.margin.left, pageHeight - 10);
        }
    });

    doc.save(`Reporte_Mensuales_${oficinaName.replace(/\s/g, '_')}.pdf`);
  };

  const generateExcel = (data: ClienteMensual[], oficinaName: string) => {
      const dataToExport = data.map(c => {
          const monthlyInterest = (c.currentBalance * c.interestRateValue) / 100;
          return {
              'ID Cliente': c.displayId,
              'Nombre Cliente': c.name,
              'Oficina': oficinas.find(o => o.id === c.oficinaId)?.name || 'N/A',
              'Estado': c.status,
              'Monto Prestado': c.loanAmount,
              'Saldo Actual': c.currentBalance,
              'Interés Mensual': monthlyInterest,
              'Interés Acumulado': c.unpaidInterest,
              'Tasa de Interés (%)': c.interestRateValue,
              'Día de Pago': c.paymentDay,
              'Fecha de Registro': c.registrationDate ? format(c.registrationDate, 'yyyy-MM-dd') : 'N/A',
          }
      });
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Reporte ${oficinaName}`);
      XLSX.writeFile(workbook, `Reporte_Mensuales_${oficinaName.replace(/\s/g, '_')}.xlsx`);
  }


  const oficinaMap = React.useMemo(() => new Map(oficinas.map(o => [o.id, o.name])), [oficinas]);

  const filteredAndSortedClientes = React.useMemo(() => {
    return clientes
      .filter(cliente => {
        const searchTermLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || cliente.name.toLowerCase().includes(searchTermLower) || cliente.displayId?.toString().includes(searchTermLower);
        
        const matchesOficina = selectedOficina === 'all' || cliente.oficinaId === selectedOficina;

        return matchesSearch && matchesOficina;
      })
      .sort((a, b) => {
        const oficinaA = oficinaMap.get(a.oficinaId) || 'zzzz';
        const oficinaB = oficinaMap.get(b.oficinaId) || 'zzzz';
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
            <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
                <FileDown className="mr-2 h-4 w-4" /> Exportar
            </Button>
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
       <ExportDialog 
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        oficinas={oficinas}
        onExport={handleExport}
        isExporting={isExporting}
      />
    </div>
  );
}
