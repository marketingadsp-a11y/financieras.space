"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { VisorSupervisor, VisorClient, VisorVisit } from "@/lib/data";
import { getSupervisorById, getClientsBySupervisor, addClient, deleteClient, getVisitsBySupervisorForWeek, updateClient } from "@/services/visor-app-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, ArrowLeft, Trash2, QrCode, User, CheckCircle, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ClientForm } from "./client-form";
import Link from "next/link";
import QRCode from "qrcode.react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);


export function SupervisorClientManagement({ supervisorId }: { supervisorId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [supervisor, setSupervisor] = React.useState<VisorSupervisor | null>(null);
  const [clients, setClients] = React.useState<VisorClient[]>([]);
  const [visitsThisWeek, setVisitsThisWeek] = React.useState<VisorVisit[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<VisorClient | null>(null);
  const [selectedClientForQr, setSelectedClientForQr] = React.useState<VisorClient | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const supervisorData = await getSupervisorById(supervisorId);
      if (!supervisorData) {
        toast({ variant: "destructive", title: "Error", description: "No se encontró el supervisor con el ID proporcionado." });
        setIsLoading(false);
        return;
      }
      setSupervisor(supervisorData);

      const clientData = await getClientsBySupervisor(supervisorId);
      setClients(clientData || []);

    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
    } finally {
      setIsLoading(false);
    }
  }, [supervisorId, toast]);

  React.useEffect(() => {
    fetchData();

    // Set up real-time listener for visits
    const unsubscribe = getVisitsBySupervisorForWeek(supervisorId, (visits) => {
        setVisitsThisWeek(visits || []);
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, [fetchData, supervisorId]);

  const handleFormSubmit = async (data: { name: string, qrCodeValue?: string }) => {
    if (!user?.prefix) return;
    setIsSubmitting(true);
    try {
      if (editingClient) {
        await updateClient(editingClient.id, data);
        toast({ title: "Éxito", description: "Cliente actualizado." });
      } else {
        await addClient({ ...data, prefix: user.prefix, supervisorId });
        toast({ title: "Éxito", description: "Cliente agregado." });
      }
      setIsFormOpen(false);
      setEditingClient(null);
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el cliente." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      await deleteClient(clientId);
      toast({ title: "Éxito", description: "Cliente eliminado." });
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el cliente." });
    }
  };
  
  const handleEditClick = (client: VisorClient) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };
  
  const printQrCode = () => {
    const qrCodeSvg = document.getElementById('qr-code-to-print');
    if (qrCodeSvg && selectedClientForQr) {
      const svgData = new XMLSerializer().serializeToString(qrCodeSvg);
      const printWindow = window.open('', '_blank');
      printWindow?.document.write(`
        <html>
          <head><title>Código QR - ${selectedClientForQr.name}</title></head>
          <body style="text-align: center; margin-top: 50px;">
            <h2>${selectedClientForQr.name}</h2>
            ${svgData}
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              }
            </script>
          </body>
        </html>
      `);
      printWindow?.document.close();
    }
  };

  const visitedClientIds = React.useMemo(() => {
    return new Set(visitsThisWeek.map(v => v.clientId));
  }, [visitsThisWeek]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando clientes...</span>
      </div>
    );
  }

  if (!supervisor) {
    return <p className="text-center">Supervisor no encontrado.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
            <Link href="/tools/visor-app">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Supervisores
            </Link>
        </Button>
      </div>
      
       <div className="grid gap-4 md:grid-cols-2">
            <StatCard title="Total de Clientes" value={clients.length} icon={User} />
            <StatCard title="Visitas de la Semana" value={`${visitedClientIds.size} / ${clients.length}`} icon={CheckCircle} />
        </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Clientes de {supervisor.name}</CardTitle>
              <CardDescription>{clients.length} cliente(s) asignado(s).</CardDescription>
            </div>
            <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingClient(null); }}>
              <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2" /> Agregar Cliente</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingClient ? "Editar" : "Agregar"} Cliente a {supervisor.name}</DialogTitle>
                </DialogHeader>
                <ClientForm onSubmit={handleFormSubmit} client={editingClient} isSubmitting={isSubmitting}/>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
           <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Cliente</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length > 0 ? (
                  clients.map(client => (
                    <TableRow key={client.id} className={cn(visitedClientIds.has(client.id) && "bg-green-500/10 hover:bg-green-500/20")}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="text-right space-x-2">
                         <Button variant="outline" size="icon" onClick={() => setSelectedClientForQr(client)}>
                            <QrCode className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleEditClick(client)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteClient(client.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                      No hay clientes asignados a este supervisor.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
       <Dialog open={!!selectedClientForQr} onOpenChange={() => setSelectedClientForQr(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Código QR para {selectedClientForQr?.name}</DialogTitle>
            <DialogDescription>
              Este código es único para este cliente. Puedes imprimirlo o guardarlo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center p-6">
            {selectedClientForQr && (
              <QRCode
                id="qr-code-to-print"
                value={selectedClientForQr.qrCodeValue}
                size={256}
                level={"H"}
                includeMargin={true}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedClientForQr(null)}>Cerrar</Button>
            <Button onClick={printQrCode}>Imprimir QR</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
