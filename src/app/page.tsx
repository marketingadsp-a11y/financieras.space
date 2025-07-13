import {
  DollarSign,
  Users,
  TrendingUp,
  BadgePercent,
  Activity,
  Calendar,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { PortfolioChart } from "@/components/dashboard/portfolio-chart";
import { DelinquencyChart } from "@/components/dashboard/delinquency-chart";

export default function DashboardPage() {
  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Panel de Control</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valor Total del Portafolio
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$4,231,890.00</div>
            <p className="text-xs text-muted-foreground">
              +2.1% desde el mes pasado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Préstamos Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+1,234</div>
            <p className="text-xs text-muted-foreground">
              +18.1% desde el mes pasado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tasa de Morosidad
            </CardTitle>
            <BadgePercent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5.3%</div>
            <p className="text-xs text-muted-foreground">
              +0.5% desde el mes pasado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Nuevos Préstamos este Mes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+57</div>
            <p className="text-xs text-muted-foreground">
              +12 desde el mes pasado
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> Valor del Portafolio a lo Largo del Tiempo
            </CardTitle>
            <CardDescription>
              Resumen mensual del valor total de su portafolio.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <PortfolioChart />
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Morosidad por Mes
            </CardTitle>
            <CardDescription>
              Número de nuevas cuentas morosas cada mes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DelinquencyChart />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
