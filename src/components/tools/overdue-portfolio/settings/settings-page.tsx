
"use client";

import * as React from "react";
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, Loader2, ClipboardPaste } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { addMultipleCustomers } from "@/services/customer-service";
import { addPlaza, getPlazas } from "@/services/plaza-service";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";

export function OverduePortfolioSettingsPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [importMode, setImportMode] = React.useState<'add' | 'replace'>('add');
    const [isImporting, setIsImporting] = React.useState(false);
    const toolContext = 'overdue-portfolio';

    const handleDownloadTemplate = () => {
        const headers = ["FECHA", "PLAZA", "PROMOTOR", "GRUPO", "NOMBRE", "DIRECCION", "TELEFONO", "AVAL", "TEL. AVAL", "PRESTAMO", "PAGO", "NO.VENC.", "ADEUDO"];
        const exampleData = [
            ["01/05/2024", "Plaza Central", "JUAN PEREZ", "Grupo A", "CLIENTE DE EJEMPLO 1", "CALLE FALSA 123", "5551234567", "AVAL DE EJEMPLO 1", "5557654321", 10000, 1000, 2, 5000],
            ["15/05/2024", "Plaza Norte", "MARIA LOPEZ", "Grupo B", "CLIENTE DE EJEMPLO 2", "AVENIDA SIEMPRE VIVA 742", "5552345678", "NO", "", 25000, 2500, 1, 12500],
        ];

        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");

        // Set column widths for better readability
        worksheet['!cols'] = headers.map(h => ({ wch: h.length + 5 }));

        XLSX.writeFile(workbook, "plantilla_cartera_vencida.xlsx");
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

                const workbook = XLSX.read(fileContent, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" }) as any[][];

                if (!json || json.length < 2) {
                    setIsImporting(false);
                    return toast({ variant: "destructive", title: "Error", description: "El archivo de Excel está vacío o no tiene un formato válido." });
                }

                const headers = json[0].map(h => String(h || '').trim().toUpperCase());
                
                const getIndex = (keys: string[]) => keys.reduce((acc, key) => (acc !== -1 ? acc : headers.indexOf(key)), -1);

                const promoterIdx = getIndex(["PROMOTOR", "PROMOTOR/A"]);
                const groupIdx = getIndex(["GRUPO"]);
                const plazaIdx = getIndex(["PLAZA"]);
                const fechaIdx = getIndex(["FECHA", "F. PRESTAMO"]);
                const nombreIdx = getIndex(["NOMBRE", "CLIENTE"]);
                const direccionIdx = getIndex(["DIRECCION"]);
                const telefonoIdx = getIndex(["TELEFONO", "TELEFONOS"]);
                const avalIdx = getIndex(["AVAL"]);
                const telAvalIdx = getIndex(["TEL. AVAL", "TELEFONO AVAL"]);
                const prestamoIdx = getIndex(["PRESTAMO"]);
                const pagoIdx = getIndex(["PAGO"]);
                const vencidosIdx = getIndex(["NO.VENC.", "VENCIDOS"]);
                const debeIdx = getIndex(["DEBE", "ADEUDO", "SALDO"]);

                if (nombreIdx === -1 || prestamoIdx === -1 || debeIdx === -1) {
                    setIsImporting(false);
                    return toast({ variant: "destructive", title: "Error", description: "El archivo debe contener al menos las columnas: NOMBRE, PRESTAMO y DEBE." });
                }

                const dataRows = json.slice(1);
                
                const existingPlazas = await getPlazas({ prefix: user.prefix, fetchAll: false, toolContext });
                const plazaMap: Record<string, string> = {};
                existingPlazas.forEach(p => { plazaMap[p.name.toUpperCase()] = p.id; });

                const parsedCustomers: Omit<Customer, 'id'>[] = [];
                let currentPromoter = "";

                for (const row of dataRows) {
                    // Check if the row could be a promoter row
                    if (row.length === 1 && String(row[0] || "").trim()) {
                        currentPromoter = String(row[0]).trim();
                        continue;
                    }
                    
                    const promoterFromFile = promoterIdx > -1 ? String(row[promoterIdx] || '').trim() : '';

                    const plazaName = plazaIdx > -1 ? String(row[plazaIdx] || '').trim() : 'General';
                    if (!plazaName) continue;

                    let plazaId = plazaMap[plazaName.toUpperCase()];
                    if (!plazaId) {
                        const newPlaza = await addPlaza({ name: plazaName, prefix: user.prefix, toolContext });
                        plazaId = newPlaza.id;
                        plazaMap[plazaName.toUpperCase()] = newPlaza.id;
                    }
                    
                    const parseNumeric = (val: any) => {
                        if (val === null || val === undefined) return 0;
                        const num = parseFloat(String(val).replace(/[^0-9.-]+/g,""));
                        return isNaN(num) ? 0 : num;
                    };
                    
                    const parseDate = (val: any): Date | undefined => {
                        if (!val) return undefined;
                        if (val instanceof Date) return val;
                        try {
                           if (typeof val === 'number') {
                                return new Date(Math.round((val - 25569) * 86400 * 1000));
                            }
                            const parsed = new Date(val);
                            if (isNaN(parsed.getTime())) return undefined;
                            return parsed;
                        } catch {
                            return undefined;
                        }
                    };

                    const loanAmount = parseNumeric(row[prestamoIdx]);

                    parsedCustomers.push({
                        plazaId,
                        prefix: user.prefix,
                        toolContext,
                        status: 'Pendiente', 
                        promoter: promoterFromFile || currentPromoter,
                        groupName: groupIdx > -1 ? String(row[groupIdx] || '').trim() : '',
                        name: String(row[nombreIdx] || ''),
                        address: direccionIdx > -1 ? String(row[direccionIdx] || '') : '',
                        phone: telefonoIdx > -1 ? String(row[telefonoIdx] || '') : '',
                        guarantor: avalIdx > -1 ? String(row[avalIdx] || '') : '',
                        guarantorPhone: telAvalIdx > -1 ? String(row[telAvalIdx] || '') : '',
                        loanAmount: loanAmount,
                        paymentAmount: pagoIdx > -1 ? parseNumeric(row[pagoIdx]) : 0,
                        installmentsDue: vencidosIdx > -1 ? parseInt(String(row[vencidosIdx] || 0), 10) : 0,
                        dueAmount: debeIdx > -1 ? parseNumeric(row[debeIdx]) : loanAmount,
                        fechaPrestamo: fechaIdx > -1 ? parseDate(row[fechaIdx]) : undefined,
                    });
                }
                
                await addMultipleCustomers(parsedCustomers, importMode, user.prefix);
                toast({ title: "Éxito", description: `${parsedCustomers.length} clientes importados.` });
                setImportModalOpen(false);
                setIsImporting(false);
            };
            reader.onerror = () => {
                toast({ variant: "destructive", title: "Error de Archivo", description: "No se pudo leer el archivo seleccionado." });
                setIsImporting(false);
            }
            reader.readAsArrayBuffer(selectedFile);

        } catch (error) {
            toast({ variant: "destructive", title: "Error de Importación", description: "Ocurrió un error inesperado al iniciar la importación." });
            setIsImporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Ajustes de Cartera Vencida</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Importación Masiva desde Excel</CardTitle>
                    <CardDescription>
                        Usa esta sección para cargar o actualizar tu cartera de clientes desde un archivo de Excel. Descarga la plantilla para asegurar el formato correcto.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 border-2 border-dashed rounded-lg text-center">
                        <FileDown className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-lg font-semibold">Descargar Plantilla</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Asegúrate de que tu archivo de Excel tenga las mismas columnas que esta plantilla para una importación exitosa.
                        </p>
                        <Button className="mt-4" onClick={handleDownloadTemplate}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Descargar Plantilla Excel
                        </Button>
                    </div>

                     <div className="p-4 border rounded-lg space-y-4">
                        <h3 className="text-lg font-semibold">Subir Archivo</h3>
                         <div className="space-y-2">
                            <Label>1. Modo de Importación</Label>
                            <RadioGroup defaultValue="add" value={importMode} onValueChange={(value) => setImportMode(value as any)} className="flex items-center gap-6">
                                <div className="flex items-center space-x-2">
                                <RadioGroupItem value="add" id="r-add" />
                                <Label htmlFor="r-add">Añadir a clientes existentes</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                <RadioGroupItem value="replace" id="r-replace" />
                                <Label htmlFor="r-replace">Reemplazar todos los datos</Label>
                                </div>
                            </RadioGroup>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="excel-file">2. Selecciona tu archivo de Excel</Label>
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
