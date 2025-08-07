
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { SupportTicket } from "@/lib/data";
import { getSupportTickets, updateSupportTicketStatus, deleteSupportTicket } from "@/services/support-ticket-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Loader2, MoreHorizontal, Ticket, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function SupportTicketsPanel() {
    const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const { toast } = useToast();

    const fetchTickets = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getSupportTickets();
            setTickets(data);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los tickets de soporte." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);
    
    const handleStatusChange = async (ticketId: string, newStatus: SupportTicket['status']) => {
        try {
            await updateSupportTicketStatus(ticketId, newStatus);
            toast({ title: "Éxito", description: "Estado del ticket actualizado." });
            fetchTickets();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el estado del ticket." });
        }
    };
    
    const handleDelete = async (ticketId: string) => {
        try {
            await deleteSupportTicket(ticketId);
            toast({ title: "Éxito", description: "Ticket eliminado." });
            fetchTickets();
        } catch (error) {
             toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el ticket." });
        }
    }
    
    const getStatusVariant = (status: SupportTicket['status']) => {
        switch (status) {
            case 'new': return 'destructive';
            case 'in-progress': return 'default';
            case 'resolved': return 'secondary';
            default: return 'outline';
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tickets de Soporte</CardTitle>
                <CardDescription>Visualiza y gestiona las solicitudes de soporte de los usuarios.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                        <span>Cargando tickets...</span>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Usuario (Empresa)</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead>Contacto</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tickets.length > 0 ? (
                                    tickets.map(ticket => (
                                        <TableRow key={ticket.id}>
                                            <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: es })}</TableCell>
                                            <TableCell>
                                                <p className="font-medium">{ticket.userName}</p>
                                                <p className="text-xs text-muted-foreground">{ticket.userPrefix}</p>
                                            </TableCell>
                                            <TableCell className="max-w-sm whitespace-pre-wrap">{ticket.description}</TableCell>
                                            <TableCell>{ticket.contactPhone}</TableCell>
                                            <TableCell><Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                 <AlertDialog>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'new')}>Marcar como Nuevo</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'in-progress')}>Marcar como En Progreso</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'resolved')}>Marcar como Resuelto</DropdownMenuItem>
                                                             <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={e => e.preventDefault()}>
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                     <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                                            <AlertDialogDescription>Esta acción eliminará el ticket de soporte de forma permanente.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(ticket.id)}>Eliminar</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-40 text-center">
                                            <Ticket className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                            <p className="mt-4">No hay tickets de soporte.</p>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
