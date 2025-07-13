import { CustomerTable } from "@/components/customers/customer-table";
import { customers } from "@/lib/data";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CustomersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customers</CardTitle>
        <CardDescription>
          Search and manage your customer accounts and loan details.
        </CardDescription>
      </CardHeader>
      <CustomerTable data={customers} />
    </Card>
  );
}
