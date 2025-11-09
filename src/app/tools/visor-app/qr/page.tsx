
"use client";

import * as React from "react";
import { createRoot } from "react-dom/client";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import type { VisorSupervisor, VisorClient, VisorVisit, CompanyProfile } from "@/lib/data";
import { getSupervisorByAccessCode, getClientsBySupervisor, addVisit, getSupervisorById } from "@/services/visor-app-service";
import { getCompanyProfileByPrefix } from "@/services/company-profile-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, KeyRound, LogIn, Users, QrCode, LogOut, CheckCircle, User, ScanLine, Percent, MapPin, AlertTriangle } from "lucide-react";
import { QrScanner } from "@/components/tools/visor-app/qr-scanner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { onSnapshot, collection, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { startOfWeek, endOfWeek } from 'date-fns';
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
                        type="tel"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="••••"
                        className="text-center text-4xl font-bold tracking-[1em] h-16"
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
    const [visitsThisWeek, setVisitsThisWeek] = React.useState<VisorVisit[]>([]);
    const [accessCode, setAccessCode] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [showScanner, setShowScanner] = React.useState(false);
    const [showClientList, setShowClientList] = React.useState(false);
    const [visitSuccessInfo, setVisitSuccessInfo] = React.useState<{ clientName: string } | null>(null);
    const [isProcessingVisit, setIsProcessingVisit] = React.useState(false);
    const [showLocationErrorModal, setShowLocationErrorModal] = React.useState(false);
    const [successImageUrl, setSuccessImageUrl] = React.useState<string | null>(null);

    const fetchData = React.useCallback(async (supervisorId: string) => {
        try {
            const supervisorData = await getSupervisorById(supervisorId);
            if (supervisorData) {
                setSupervisor(supervisorData);
                const clientData = await getClientsBySupervisor(supervisorId);
                setClients(clientData);

                 // Fetch company profile for success image
                if (supervisorData.prefix) {
                    const profile = await getCompanyProfileByPrefix(supervisorData.prefix);
                    if (profile?.visorAppSuccessImageUrl) {
                        setSuccessImageUrl(profile.visorAppSuccessImageUrl);
                    }
                }
            }
        } catch (err) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron recargar los datos.' });
        }
    }, [toast]);
    
    // Set up real-time listener for visits when a supervisor logs in
    React.useEffect(() => {
        if (!supervisor) return;

        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
        const weekEnd = endOfWeek(now, { weekStartsOn: 0 }); // Saturday

        const q = query(
            collection(db, "visor_visits"),
            where("supervisorId", "==", supervisor.id),
            where("timestamp", ">=", weekStart),
            where("timestamp", "<=", weekEnd)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const visits = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            timestamp: (doc.data().timestamp as Timestamp).toDate(),
            })) as VisorVisit[];
            setVisitsThisWeek(visits);
        }, (error) => {
            console.error("Error fetching visits in real-time: ", error);
            // If collection doesn't exist, it will error. We can handle it gracefully.
            setVisitsThisWeek([]);
        });

        // Cleanup listener on component unmount or when supervisor logs out
        return () => unsubscribe();
    }, [supervisor]);


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
                fetchData(foundSupervisor.id);
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
        setSuccessImageUrl(null);
    };
    
    const handleScanSuccess = async (qrCodeValue: string) => {
        setShowScanner(false);
        if (!supervisor) return;
        
        setIsProcessingVisit(true);
        
        const processVisit = async (location: GeolocationCoordinates) => {
            try {
                // The client matching logic is now inside the addVisit cloud function
                // for security and atomicity. We just send the necessary data.
                await addVisit({
                    prefix: supervisor.prefix,
                    supervisorId: supervisor.id,
                    qrCodeValue: qrCodeValue,
                    latitude: location.latitude,
                    longitude: location.longitude,
                });
                
                // For the success message, we need to find the client locally
                const client = clients.find(c => c.qrCodeValue === qrCodeValue);
                setVisitSuccessInfo({ clientName: client?.name || "Cliente Desconocido" });

            } catch(err: any) {
                 toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: err.message || 'No se pudo registrar la visita.',
                });
            } finally {
                setIsProcessingVisit(false);
            }
        };

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    processVisit(position.coords);
                },
                (error) => {
                    console.warn("Could not get location: ", error.message);
                    setShowLocationErrorModal(true);
                    setIsProcessingVisit(false); // Stop processing
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setShowLocationErrorModal(true);
            setIsProcessingVisit(false); // Stop processing
        }
    };
    
    const visitedClientIds = React.useMemo(() => {
        return new Set(visitsThisWeek.map(v => v.clientId));
    }, [visitsThisWeek]);
    
    const visitPercentage = clients.length > 0 ? (visitedClientIds.size / clients.length) * 100 : 0;


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
                     {supervisor.logoUrl && (
                        <Avatar className="mx-auto h-24 w-24 mb-4 border">
                            <AvatarImage src={supervisor.logoUrl} alt={supervisor.name} />
                            <AvatarFallback>{supervisor.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    )}
                    <CardTitle>
                        Hola, <span className="text-primary">{supervisor.name}</span>
                    </CardTitle>
                    <CardDescription>Selecciona una opción para continuar.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button className="w-full h-24 text-lg" onClick={() => setShowScanner(true)} disabled={isProcessingVisit}>
                        {isProcessingVisit ? <Loader2 className="mr-4 h-8 w-8 animate-spin" /> : <QrCode className="mr-4 h-8 w-8" />}
                        {isProcessingVisit ? 'Procesando visita...' : 'Realizar Visita'}
                    </Button>
                     <div className="space-y-2">
                        <Button variant="outline" className="w-full h-16 text-md" onClick={() => setShowClientList(!showClientList)}>
                            <Users className="mr-4 h-6 w-6" />
                            {showClientList ? "Ocultar" : "Ver"} mis Clientes ({clients.length})
                        </Button>
                        <div className="flex items-center justify-center gap-2 rounded-md border p-2 text-sm text-muted-foreground">
                            <Percent className="h-4 w-4" />
                            <span>Progreso de la semana: {visitedClientIds.size} de {clients.length} visitas ({visitPercentage.toFixed(1)}%)</span>
                        </div>
                    </div>

                    {showClientList && (
                        <div className="mt-4 p-4 border rounded-lg max-h-60 overflow-y-auto text-left">
                            <h4 className="font-semibold mb-2">Lista de Clientes ({visitedClientIds.size} / {clients.length} visitados)</h4>
                            <ul className="space-y-2">
                                {clients.map(client => {
                                    const visit = visitsThisWeek.find(v => v.clientId === client.id);
                                    return (
                                        <li 
                                            key={client.id}
                                            className={cn(
                                                "p-2 rounded-md flex items-center justify-between transition-colors",
                                                visit
                                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                                                    : "bg-background"
                                            )}
                                        >
                                            <div className="flex items-center">
                                                {visit ? (
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                ) : (
                                                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                                )}
                                                {client.name}
                                            </div>
                                             {visit && visit.latitude && visit.longitude && (
                                                <a
                                                    href={`https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 rounded-full hover:bg-green-200 dark:hover:bg-green-800"
                                                >
                                                    <MapPin className="h-4 w-4" />
                                                </a>
                                            )}
                                        </li>
                                    )
                                })}
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

            <AlertDialog open={!!visitSuccessInfo} onOpenChange={() => setVisitSuccessInfo(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                         <div className="flex justify-center mb-4">
                            {successImageUrl ? (
                                <img src={successImageUrl} alt="Visita registrada con éxito" className="w-32 h-32 rounded-md" />
                            ) : (
                                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle className="h-10 w-10 text-green-600"/>
                                </div>
                            )}
                        </div>
                        <AlertDialogTitle className="text-center text-2xl">¡Visita Registrada!</AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                            Se ha registrado la visita para <strong>{visitSuccessInfo?.clientName}</strong> con éxito.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center pt-4 gap-2">
                        <AlertDialogAction onClick={() => { setVisitSuccessInfo(null); setShowScanner(true); }} className="w-full sm:w-auto">
                            <ScanLine className="mr-2"/> Escanear Otro
                        </AlertDialogAction>
                        <AlertDialogCancel onClick={() => setVisitSuccessInfo(null)} className="w-full sm:w-auto mt-0">
                            Cerrar
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={showLocationErrorModal} onOpenChange={setShowLocationErrorModal}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex justify-center mb-4">
                            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                                <AlertTriangle className="h-10 w-10 text-destructive"/>
                            </div>
                        </div>
                        <AlertDialogTitle className="text-center text-2xl">Permiso de Ubicación Requerido</AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                           No se pudo obtener la ubicación, por lo que la visita no se puede registrar. Para intentarlo de nuevo, recarga la página y acepta la solicitud de permiso de ubicación.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center pt-4 gap-2">
                        <AlertDialogAction onClick={() => window.location.reload()} className="w-full sm:w-auto">
                           Recargar Página
                        </AlertDialogAction>
                        <AlertDialogCancel onClick={() => setShowLocationErrorModal(false)} className="w-full sm:w-auto mt-0">
                            Cerrar
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

    