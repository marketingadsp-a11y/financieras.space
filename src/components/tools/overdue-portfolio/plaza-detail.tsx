
"use client";

import * as React from "react";
import {
  DollarSign,
  Users,
  UserCheck,
  Search,
  PlusCircle,
  Upload,
  Trash2,
  MoreHorizontal,
  User,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Plaza } from "@/lib/data";
import { getPlazaById } from "@/services/plaza-service";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// --- DATOS DE EJEMPLO PARA CLIENTES ---
const sampleCustomers = [
    {
        id: "1",
        name: "ADRIAN BRAMBILA VELASCO",
        address: "TABACHINES 127",
        phone: "6631227486",
        guarantor: "IRVING ALEJANDRO RAMIREZ MORENO",
        loanAmount: 4000.00,
        dueAmount: 936.00,
        status: "Pendiente"
    },
    {
        id: "2",
        name: "ALMA VIOLETA SILVA FREGOSO",
        address: "SANTOS DEGOLLADO 322",
        phone: "3171075566",
        guarantor: "OMAR BERNABE RODRIGUEZ",
        loanAmount: 3000.00,
        dueAmount: 1500.00,
        status: "Pendiente"
    },
    {
        id: "3",
        name: "ALVARO RAFAEL RAMOS MEJIA",
        address: "CUAHUTEMOC 24",
        phone: "3328994967",
        guarantor: "NO",
        loanAmount: 10000.00,
        dueAmount: 8190.00,
        status: "Pendiente"
    },
    {
        id: "4",
        name: "AMERICA LIZBETH HERNANDEZ PADILLA",
        address: "CORONA ARAIZA 494",
        phone: "3171090401",
        guarantor: "LUIS EDUARDO LOPEZ HERNANDEZ",
        loanAmount: 15000.00,
        dueAmount: 18750.00,
        status: "Pendiente"
    },
     {
        id: "5",
        name: "CINTHIA AZUCENA SANCHEZ PAEZ",
        address: "VALLE DE GUADALUPE 85",
        phone: "3171315285",
        guarantor: "ANA ALICIA RODRIGUEZ AGUILAR",
        loanAmount: 3000.00,
        dueAmount: 1500.00,
        status: "Pendiente"
    },
    {
        id: "6",
        name: "DIEGO ARMANDO FLORES GOMEZ",
        address: "EMILIANO ZAPATA 1",
        phone: "3171014510",
        guarantor: "AURELIA GOMEZ HORTA",
        loanAmount: 3000.00,
        dueAmount: 375.00,
        status: "Pendiente"
    },
    {
        id: "7",
        name: "DIEGO JOSE GUZMAN GONZALEZ",
        address: "PLACERES 250 A",
        phone: "3171203978",
        guarantor: "GARANTIA FACTURA MOTO",
        loanAmount: 10000.00,
        dueAmount: 0.00,
        status: "Pagado"
    },
     {
        id: "8",
        name: "GUMERCINDO VARGAS HERNANDEZ",
        address: "DEGOOLLADO 200",
        phone: "3171238682",
        guarantor: "VALERIA MORALES ZACARIAS",
        loanAmount: 20000.00,
        dueAmount: 25740.00,
        status: "Pendiente"
    }
];

const StatCard = ({ title, value, icon: Icon, description, isCurrency = false, variant = 'default' }) => {
    const cardClasses = {
        default: "bg-card text-card-foreground",
        destructive: "bg-destructive/90 text-destructive-foreground",
    }
    const iconClasses = {
        default: "text-muted-foreground",
        destructive: "text-destructive-foreground/70",
    }
    
    return (
        <Card className={cardClasses[variant]}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${iconClasses[variant]}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {isCurrency ? `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}
                </div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );
};


const CustomerCard = ({ customer }) => (
  <Card>
    <CardHeader>
      <div className="flex justify-between items-start">
        <CardTitle className="text-base font-bold">{customer.name}</CardTitle>
        <Badge variant={customer.status === 'Pendiente' ? 'destructive' : 'secondary'} className="capitalize">
          {customer.status}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground pt-1">{customer.address}</p>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2 text-sm">
        <div className="flex items-center">
          <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>{customer.phone || 'No disponible'}</span>
        </div>
        <div className="flex items-center">
          <User className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>{customer.guarantor || 'No disponible'}</span>
        </div>
      </div>
      <div className="flex justify-between items-end border-t pt-4">
        <div>
          <p className="text-xs text-muted-foreground">Préstamo</p>
          <p className="font-semibold">${customer.loanAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Adeudo</p>
          <p className="font-bold text-destructive">${customer.dueAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
    </CardContent>
    <div className="flex items-center p-6 pt-0">
        <Button variant="outline" className="w-full mr-2">
            Editar
        </Button>
        <Button className="w-full">
            <DollarSign className="mr-2 h-4 w-4"/> Abonar
        </Button>
    </div>
  </Card>
);

export function PlazaDetail({ plazaId }: { plazaId: string }) {
  const [plaza, setPlaza] = React.useState<Plaza | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchPlaza = async () => {
      try {
        setIsLoading(true);
        const plazaData = await getPlazaById(plazaId);
        if (plazaData) {
          setPlaza(plazaData);
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se encontró la plaza especificada.",
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar la información de la plaza.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlaza();
  }, [plazaId, toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando información de la plaza...</span>
      </div>
    );
  }

  if (!plaza) {
    return <div className="text-center">No se pudo cargar la información de la plaza.</div>;
  }
  
  // --- DATOS DE EJEMPLO PARA RESUMEN ---
  const totalClients = sampleCustomers.length;
  const recoveredClients = sampleCustomers.filter(c => c.status === 'Pagado').length;
  const pendingDebt = sampleCustomers.reduce((acc, c) => acc + c.dueAmount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Plaza: {plaza.name}</h1>
      
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Deuda Pendiente" value={pendingDebt} icon={DollarSign} isCurrency variant="destructive" />
        <StatCard title="Total de Clientes" value={totalClients} icon={Users} />
        <StatCard title="Recuperados" value={recoveredClients} icon={UserCheck} description={`de ${totalClients} clientes`} />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Clientes de {plaza.name}</h2>
          <p className="text-muted-foreground">{totalClients} cliente(s) en esta plaza.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-2 items-center">
            <div className="relative w-full md:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar cliente..." className="pl-9" />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Registrar
                </Button>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" /> Importar
                </Button>
                <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Todos
                </Button>
                <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sampleCustomers.map(customer => (
                <CustomerCard key={customer.id} customer={customer} />
            ))}
        </div>
      </div>
    </div>
  );
}
