
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LifeBuoy, Loader2 } from "lucide-react";
import { getAppSettings, type SupportInfo } from "@/services/app-settings-service";

export function SupportPage() {
    const [supportInfo, setSupportInfo] = React.useState<SupportInfo | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchSupportInfo = async () => {
            setIsLoading(true);
            try {
                const settings = await getAppSettings();
                setSupportInfo(settings?.supportInfo || { title: "Soporte", content: "No hay información de soporte disponible." });
            } catch (error) {
                console.error("Failed to fetch support info", error);
                setSupportInfo({ title: "Error", content: "No se pudo cargar la información de soporte." });
            } finally {
                setIsLoading(false);
            }
        }
        fetchSupportInfo();
    }, []);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg w-fit">
                        <LifeBuoy className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">{supportInfo?.title || ""}</CardTitle>
                        <CardDescription>Información y contacto para asistencia técnica.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        <span>Cargando información...</span>
                    </div>
                ) : (
                    <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                        <p>{supportInfo?.content}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
