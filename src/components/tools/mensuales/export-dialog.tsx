
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, FileSpreadsheet, FileText } from "lucide-react";
import type { OficinaMensual } from "@/lib/data";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type ExportDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  oficinas: OficinaMensual[];
  onExport: (oficinaId: string, format: 'pdf' | 'excel') => Promise<void>;
  isExporting: boolean;
};

export function ExportDialog({ isOpen, onClose, oficinas, onExport, isExporting }: ExportDialogProps) {
  const [selectedOficinaId, setSelectedOficinaId] = React.useState<string>('all');
  
  const handleExportClick = (formatType: 'pdf' | 'excel') => {
    onExport(selectedOficinaId, formatType);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Reporte de Préstamos</DialogTitle>
          <DialogDescription>
            Selecciona la oficina para generar el reporte.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
            <div className="space-y-2">
                <Label>1. Seleccionar Oficina</Label>
                 <RadioGroup value={selectedOficinaId} onValueChange={setSelectedOficinaId} className="space-y-2">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="all-oficinas" />
                        <Label htmlFor="all-oficinas" className="font-semibold">Todas las oficinas</Label>
                    </div>
                    {oficinas.map(o => (
                        <div key={o.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={o.id} id={o.id} />
                            <Label htmlFor={o.id}>{o.name}</Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <div className="flex gap-2">
            <Button onClick={() => handleExportClick('pdf')} disabled={isExporting}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileText className="mr-2 h-4 w-4"/>}
                PDF
            </Button>
            <Button onClick={() => handleExportClick('excel')} disabled={isExporting}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileSpreadsheet className="mr-2 h-4 w-4"/>}
                Excel
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
