
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { VisorSupervisor, VisorClient } from "@/lib/data";
import { getSupervisorByAccessCode, getClientsBySupervisor, addVisit, getClientByQrCodeValue } from "@/services/visor-app-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, KeyRound, LogIn, Users, QrCode, LogOut, CheckCircle, User } from "lucide-react";
import { QrScanner } from "@/components/tools/visor-app/qr-scanner";

const LoginPage = ({ onLogin, isLoading, error, accessCode, setAccessCode }: { onLogin: () => void, isLoading: boolean, error: string | null, accessCode: string, setAccessCode: (code: string) => void }) => {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <KeyRound className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Acceso de Supervisor</CardTitle>
                    <CardDescription>Ingresa tu código de 4 dígitos para acceder al panel.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input 
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="••••"
                        className="text-center text-2xl font-mono tracking-[1em] h-14"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onLogin()}
                    />
                    {error && <p className="text-sm text-destructive text-center">{error}</p>}
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={onLogin} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <LogIn className="mr-2" />}
                        Ingresar
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default function QrReaderPage() {
    const { toast } = useToast();
    const [supervisor, setSupervisor] = React.useState<VisorSupervisor | null>(null);
    const [clients, setClients] = React.useState<VisorClient[]>([]);
    const [accessCode, setAccessCode] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [showScanner, setShowScanner] = React.useState(false);
    const [showClientList, setShowClientList] = React.useState(false);

    const handleLogin = async () => {
        if (accessCode.length !== 4) {
            setError("El código debe ser de 4 dígitos.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const foundSupervisor = await getSupervisorByAccessCode(accessCode);
            if (foundSupervisor) {
                setSupervisor(foundSupervisor);
                const clientData = await getClientsBySupervisor(foundSupervisor.id);
                setClients(clientData);
            } else {
                setError("Código de acceso incorrecto.");
                setAccessCode("");
            }
        } catch (err) {
            setError("Error al verificar el código.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleLogout = () => {
        setSupervisor(null);
        setClients([]);
        setAccessCode("");
        setError(null);
    };
    
    const handleScanSuccess = async (qrCodeValue: string) => {
        setShowScanner(false);
        if (!supervisor) return;
        
        try {
            const client = await getClientByQrCodeValue(qrCodeValue);
            if (client && client.supervisorId === supervisor.id) {
                await addVisit({
                    prefix: supervisor.prefix,
                    supervisorId: supervisor.id,
                    clientId: client.id,
                    clientName: client.name,
                    timestamp: new Date(),
                });
                toast({
                    variant: 'success',
                    title: 'Visita Registrada',
                    description: `Se ha registrado la visita para ${client.name}.`,
                });
            } else if (client) {
                 toast({
                    variant: 'destructive',
                    title: 'Cliente Incorrecto',
                    description: `El cliente ${client.name} no está asignado a este supervisor.`,
                });
            }
             else {
                 toast({
                    variant: 'destructive',
                    title: 'Código QR No Válido',
                    description: 'No se encontró ningún cliente con este código.',
                });
            }
        } catch(err) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo registrar la visita.',
            });
        }
    };
    
    if (!supervisor) {
        return <LoginPage onLogin={handleLogin} isLoading={isLoading} error={error} accessCode={accessCode} setAccessCode={setAccessCode} />;
    }

    if (showScanner) {
        return <QrScanner onSuccess={handleScanSuccess} onCancel={() => setShowScanner(false)} />;
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>Panel de {supervisor.name}</CardTitle>
                    <CardDescription>Selecciona una opción para continuar.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button className="w-full h-24 text-lg" onClick={() => setShowScanner(true)}>
                        <QrCode className="mr-4 h-8 w-8" />
                        Realizar Visita
                    </Button>
                    <Button variant="outline" className="w-full h-16 text-md" onClick={() => setShowClientList(!showClientList)}>
                        <Users className="mr-4 h-6 w-6" />
                        {showClientList ? "Ocultar" : "Ver"} mis Clientes ({clients.length})
                    </Button>

                    {showClientList && (
                        <div className="mt-4 p-4 border rounded-lg max-h-60 overflow-y-auto text-left">
                            <h4 className="font-semibold mb-2">Lista de Clientes</h4>
                            <ul className="space-y-2">
                                {clients.map(client => (
                                    <li key={client.id} className="p-2 bg-background rounded-md flex items-center">
                                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                        {client.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
                 <CardFooter>
                    <Button variant="ghost" className="w-full" onClick={handleLogout}>
                        <LogOut className="mr-2" />
                        Cerrar Sesión
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
