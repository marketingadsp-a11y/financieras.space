import { RiskAssessmentForm } from "@/components/risk/risk-assessment-form";

export default function RiskAssessmentPage() {
  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Evaluación de Riesgo con IA
          </h1>
          <p className="text-muted-foreground">
            Analice los datos de los clientes para identificar cuentas de alto riesgo y recibir acciones recomendadas.
          </p>
        </div>
      </div>
      <RiskAssessmentForm />
    </>
  );
}
