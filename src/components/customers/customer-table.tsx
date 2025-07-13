"use client";

import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Customer } from "@/lib/data";
import { CardContent } from "@/components/ui/card";

export function CustomerTable({ data }: { data: Customer[] }) {
  const [filter, setFilter] = React.useState("");
  const [filteredData, setFilteredData] = React.useState(data);

  React.useEffect(() => {
    setFilteredData(
      data.filter((customer) =>
        Object.values(customer).some((value) =>
          String(value).toLowerCase().includes(filter.toLowerCase())
        )
      )
    );
  }, [filter, data]);

  const getRiskBadgeVariant = (risk: "Bajo" | "Medio" | "Alto") => {
    switch (risk) {
      case "Bajo":
        return "secondary";
      case "Medio":
        return "default";
      case "Alto":
        return "destructive";
    }
  };
  
  const getStatusBadgeVariant = (status: "Pagado" | "Pendiente" | "Vencido") => {
      switch (status) {
          case "Pagado": return "secondary";
          case "Pendiente": return "outline";
          case "Vencido": return "destructive";
      }
  }

  return (
    <CardContent>
      <div className="flex items-center pb-4">
        <Input
          placeholder="Buscar clientes..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="text-right">Monto del Préstamo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Nivel de Riesgo</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{customer.email}</TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(customer.loanAmount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(customer.status)}>
                      {customer.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getRiskBadgeVariant(customer.riskLevel)}
                      className={
                        customer.riskLevel === "Medio"
                          ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-400/80"
                          : ""
                      }
                    >
                      {customer.riskLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Alternar menú</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                        <DropdownMenuItem>Contactar cliente</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No se encontraron resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  );
}
