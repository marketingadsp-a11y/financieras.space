import { RiskAssessmentForm } from "@/components/risk/risk-assessment-form";

export default function RiskAssessmentPage() {
  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            AI Risk Assessment
          </h1>
          <p className="text-muted-foreground">
            Analyze customer data to identify high-risk accounts and receive recommended actions.
          </p>
        </div>
      </div>
      <RiskAssessmentForm />
    </>
  );
}
