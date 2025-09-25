
"use client";

import * as React from "react";
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { importMensualesData } from "@/services/mensuales-service";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function MensualesSettingsPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [isImporting, setIsImporting] = React.useState(false);

    const handleDownloadTemplate = () => {
        const headers = ["OFICINA", "CLIENTE", "MONTO PRESTAMO", "TASA INTERES (%)", "DIA PAGO"];
        const exampleData = [
            ["Oficina Matriz", "JUAN PEREZ", 10000, 5, 15],
            ["Oficina Norte", "MARIA LOPEZ", 25000, 4.5, 1],
        ];

        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");

        worksheet['!cols'] = headers.map(h => ({ wch: h.length + 5 }));
        XLSX.writeFile(workbook, "plantilla_mensuales.xlsx");
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
        }
    };
    
    const handleImport = async () => {
        if (!selectedFile) {
            toast({ variant: "destructive", title: "Error", description: "Por favor, selecciona un archivo de Excel." });
            return;
        }
        if (!user?.prefix) {
            toast({ variant: "destructive", title: "Error", description: "No tienes un prefijo asignado para importar datos." });
            return;
        }
        setIsImporting(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const fileContent = e.target?.result;
                if (!fileContent) {
                    setIsImporting(false);
                    return toast({ variant: "destructive", title: "Error", description: "No se pudo leer el archivo." });
                }

                const workbook = XLSX.read(fileContent, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet) as any[];

                if (!json || json.length === 0) {
                    setIsImporting(false);
                    return toast({ variant: "destructive", title: "Error", description: "El archivo de Excel está vacío o no tiene un formato válido." });
                }
                
                await importMensualesData(json, user.prefix);

                toast({ title: "Éxito", description: `${json.length} registros de préstamos importados.` });
                setIsImporting(false);
                setSelectedFile(null);
                // Optionally trigger a data refresh on the main dashboard if needed
                window.dispatchEvent(new Event('storage')); 
            };
            reader.onerror = () => {
                toast({ variant: "destructive", title: "Error de Archivo", description: "No se pudo leer el archivo seleccionado." });
                setIsImporting(false);
            }
            reader.readAsArrayBuffer(selectedFile);

        } catch (error: any) {
            toast({ variant: "destructive", title: "Error de Importación", description: error.message || "Ocurrió un error inesperado al iniciar la importación." });
            setIsImporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Ajustes de Préstamos Mensuales</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Importación Masiva desde Excel</CardTitle>
                    <CardDescription>
                        Carga tu cartera de préstamos mensuales desde un archivo de Excel. Descarga la plantilla para asegurar el formato correcto.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 border-2 border-dashed rounded-lg text-center">
                        <FileDown className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-lg font-semibold">Descargar Plantilla</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Usa este archivo como base para asegurar que tus datos se importen correctamente.
                        </p>
                        <Button className="mt-4" onClick={handleDownloadTemplate}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Descargar Plantilla Excel
                        </Button>
                    </div>

                     <div className="p-4 border rounded-lg space-y-4">
                        <h3 className="text-lg font-semibold">Subir Archivo</h3>
                        <div className="space-y-2">
                            <Label htmlFor="excel-file">Selecciona tu archivo de Excel</Label>
                            <Input 
                                id="excel-file"
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                     <Button onClick={handleImport} disabled={isImporting || !selectedFile}>
                        {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4"/>}
                        {isImporting ? 'Importando...' : 'Importar Archivo'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
