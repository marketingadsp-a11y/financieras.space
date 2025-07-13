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

  const getRiskBadgeVariant = (risk: "Low" | "Medium" | "High") => {
    switch (risk) {
      case "Low":
        return "secondary";
      case "Medium":
        return "default";
      case "High":
        return "destructive";
    }
  };
  
  const getStatusBadgeVariant = (status: "Paid" | "Due" | "Overdue") => {
      switch (status) {
          case "Paid": return "secondary";
          case "Due": return "outline";
          case "Overdue": return "destructive";
      }
  }

  return (
    <CardContent>
      <div className="flex items-center pb-4">
        <Input
          placeholder="Search customers..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="text-right">Loan Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
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
                        customer.riskLevel === "Medium"
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
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View details</DropdownMenuItem>
                        <DropdownMenuItem>Contact customer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  );
}
