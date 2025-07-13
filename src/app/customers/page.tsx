import { CustomerTable } from "@/components/customers/customer-table";
import { customers } from "@/lib/data";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CustomersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes</CardTitle>
        <CardDescription>
          Busque y gestione las cuentas de sus clientes y los detalles de los préstamos.
        </CardDescription>
      </CardHeader>
      <CustomerTable data={customers} />
    </Card>
  );
}
