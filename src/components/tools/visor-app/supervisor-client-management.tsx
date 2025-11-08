
"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { VisorSupervisor, VisorClient, VisorVisit } from "@/lib/data";
import { getSupervisorById, getClientsBySupervisor, addClient, deleteClient, updateClient, importClientsFromExcel, deleteAllClientsBySupervisor } from "@/services/visor-app-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, ArrowLeft, Trash2, QrCode, User, CheckCircle, Edit, Percent, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent } from "@/components/ui/alert-dialog";
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
import { onSnapshot, collection, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { startOfWeek, endOfWeek } from 'date-fns';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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

// This function now lives in the client component because it uses client-side listeners.
function getVisitsBySupervisorForWeek(supervisorId: string, callback: (visits: VisorVisit[]) => void): () => void {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 }); // Saturday

  const q = query(
    collection(db, "visor_visits"),
    where("supervisorId", "==", supervisorId),
    where("timestamp", ">=", weekStart),
    where("timestamp", "<=", weekEnd)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const visits = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      timestamp: (doc.data().timestamp as Timestamp).toDate(),
    })) as VisorVisit[];
    callback(visits);
  }, (error) => {
    console.error("Error fetching visits in real-time: ", error);
    // If collection doesn't exist, it will error. We can handle it gracefully.
    callback([]);
  });

  return unsubscribe; // Return the unsubscribe function for cleanup
}


export function SupervisorClientManagement({ supervisorId }: { supervisorId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [supervisor, setSupervisor] = React.useState<VisorSupervisor | null>(null);
  const [clients, setClients] = React.useState<VisorClient[]>([]);
  const [visitsThisWeek, setVisitsThisWeek] = React.useState<VisorVisit[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<VisorClient | null>(null);
  const [selectedClientForQr, setSelectedClientForQr] = React.useState<VisorClient | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [fileToImport, setFileToImport] = React.useState<File | null>(null);

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

  const handleFormSubmit = async (data: { name: string, address?: string, qrCodeValue?: string }) => {
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
  
 const handleImport = async () => {
    if (!fileToImport || !user?.prefix) {
        toast({ variant: "destructive", title: "Error", description: "Selecciona un archivo y asegúrate de tener un prefijo de empresa." });
        return;
    }
    setIsSubmitting(true);

    const reader = new FileReader();
    reader.readAsDataURL(fileToImport);
    reader.onload = async (event) => {
        const base64Content = event.target?.result as string;
        if (!base64Content) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo leer el contenido del archivo.'});
            setIsSubmitting(false);
            return;
        }

        try {
            const result = await importClientsFromExcel(base64Content, supervisorId, user.prefix);
            toast({ title: "Importación Completa", description: `${result.importedCount} clientes fueron importados exitosamente.` });
            fetchData();
            setIsImportOpen(false);
            setFileToImport(null);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error de Importación", description: error.message || "No se pudo importar el archivo." });
        } finally {
            setIsSubmitting(false);
        }
    };
    reader.onerror = () => {
        toast({ variant: 'destructive', title: 'Error', description: 'Hubo un problema al leer el archivo.'});
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

  const handleDeleteAllClients = async () => {
    try {
      await deleteAllClientsBySupervisor(supervisorId);
      toast({ title: "Éxito", description: `Todos los clientes de ${supervisor?.name} han sido eliminados.` });
      // Manually reset state to reflect changes instantly
      setClients([]);
      setVisitsThisWeek([]);
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudieron eliminar los clientes." });
    }
  }
  
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
            <p>${selectedClientForQr.address || ''}</p>
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
  
  const visitPercentage = clients.length > 0 ? (visitedClientIds.size / clients.length) * 100 : 0;


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
      
       <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Total de Clientes" value={clients.length} icon={User} />
            <StatCard title="Visitas de la Semana" value={`${visitedClientIds.size} / ${clients.length}`} icon={CheckCircle} />
            <StatCard title="Porcentaje de Visitas" value={`${visitPercentage.toFixed(1)}%`} icon={Percent} />
        </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Clientes de {supervisor.name}</CardTitle>
              <CardDescription>{clients.length} cliente(s) asignado(s).</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                 <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline"><Upload className="mr-2 h-4 w-4"/>Importar</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Importar Clientes desde Excel</DialogTitle>
                            <DialogDescription>
                                Selecciona un archivo .xlsx o .xls. El sistema buscará las columnas "Cliente" (o "Nombre") y "Direccion".
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <Label htmlFor="import-file">Archivo de Excel</Label>
                            <Input id="import-file" type="file" accept=".xlsx, .xls" onChange={(e) => setFileToImport(e.target.files?.[0] || null)} />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancelar</Button>
                            <Button onClick={handleImport} disabled={isSubmitting || !fileToImport}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Importar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" disabled={clients.length === 0}><Trash2 className="h-4 w-4"/></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitleComponent>¿Eliminar todos los clientes?</AlertDialogTitleComponent>
                            <AlertDialogDescription>
                                Esta acción es irreversible. Se eliminarán los {clients.length} clientes asignados a {supervisor.name}.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooterComponent>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteAllClients}>Sí, eliminar todos</AlertDialogAction>
                        </AlertDialogFooterComponent>
                    </AlertDialogContent>
                </AlertDialog>
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
          </div>
        </CardHeader>
        <CardContent>
           <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Cliente</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length > 0 ? (
                  clients.map(client => (
                    <TableRow key={client.id} className={cn(visitedClientIds.has(client.id) && "bg-green-500/10 hover:bg-green-500/20")}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="text-muted-foreground">{client.address || 'N/A'}</TableCell>
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
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
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
          <div className="flex flex-col items-center justify-center p-6">
            {selectedClientForQr && (
              <div id="qr-code-to-print" className="p-4 bg-white">
                <QRCode
                  value={selectedClientForQr.qrCodeValue}
                  size={256}
                  level={"H"}
                  includeMargin={true}
                />
              </div>
            )}
            <p className="mt-2 text-sm font-semibold">{selectedClientForQr?.name}</p>
            <p className="text-xs text-muted-foreground">{selectedClientForQr?.address}</p>
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
