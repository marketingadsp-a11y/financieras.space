
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { OficinaMensual, ClienteMensual, InterestRate } from "@/lib/data";
import { getOficinas, getClientes, addCliente, addPaymentToCliente } from "@/services/mensuales-service";
import { getInterestRates } from "@/services/interest-rate-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, DollarSign, Search, FileDown, Building, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PrestamoForm } from "./prestamo-form";
import { ExportDialog } from "./export-dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface OficinaSummary extends OficinaMensual {
  totalLoanAmount: number;
  totalUnpaidInterest: number;
  clientCount: number;
}


export function MensualesDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [oficinas, setOficinas] = React.useState<OficinaMensual[]>([]);
  const [interestRates, setInterestRates] = React.useState<InterestRate[]>([]);
  const [clientes, setClientes] = React.useState<ClienteMensual[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isPrestamoFormOpen, setIsPrestamoFormOpen] = React.useState(false);
  
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

  const oficinaSummaries: OficinaSummary[] = React.useMemo(() => {
    return oficinas.map(oficina => {
      const oficinaClientes = clientes.filter(c => c.oficinaId === oficina.id);
      const totalLoanAmount = oficinaClientes.reduce((acc, c) => acc + c.loanAmount, 0);
      const totalUnpaidInterest = oficinaClientes.reduce((acc, c) => acc + (c.unpaidInterest || 0), 0);
      return {
        ...oficina,
        totalLoanAmount,
        totalUnpaidInterest,
        clientCount: oficinaClientes.length
      };
    });
  }, [oficinas, clientes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Préstamos Mensuales</h1>
          <p className="text-muted-foreground">Resumen por oficina y acceso a funciones de gestión.</p>
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

       {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            <span>Cargando datos de oficinas...</span>
          </div>
        ) : oficinaSummaries.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {oficinaSummaries.map(oficina => (
                  <Card key={oficina.id} className="group flex flex-col">
                      <CardHeader>
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg w-fit">
                                <Building className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                            </div>
                            <div>
                                <CardTitle>{oficina.name}</CardTitle>
                                <CardDescription>{oficina.clientCount} cliente(s)</CardDescription>
                            </div>
                          </div>
                      </CardHeader>
                      <CardContent className="flex-grow space-y-4">
                          <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp/>Total Prestado</span>
                              <span className="text-lg font-bold">${oficina.totalLoanAmount.toLocaleString('es-MX')}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingDown className="text-destructive"/>Interés Pendiente</span>
                              <span className="text-lg font-bold text-destructive">${oficina.totalUnpaidInterest.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                          </div>
                      </CardContent>
                      <CardFooter>
                          <Button asChild className="w-full">
                              <Link href={`/tools/mensuales/oficina/${oficina.id}`}>
                                  Ver Detalles <ArrowRight className="ml-2 h-4 w-4"/>
                              </Link>
                          </Button>
                      </CardFooter>
                  </Card>
              ))}
          </div>
      ) : (
          <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                  No hay oficinas creadas. Comienza por crear una en la sección de "Oficinas".
              </CardContent>
          </Card>
      )}
      
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
