'use server';

/**
 * @fileOverview AI-powered tool for assessing customer risk of becoming delinquent.
 *
 * - assessCustomerRisk - Function to assess customer risk and prioritize outreach.
 * - CustomerRiskInput - Input type for customer risk assessment.
 * - CustomerRiskOutput - Output type for customer risk assessment.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CustomerRiskInputSchema = z.object({
  customerData: z
    .string()
    .describe('Datos completos sobre el cliente, incluyendo historial financiero, comportamiento de pago e información demográfica.'),
  loanDetails: z
    .string()
    .describe('Detalles sobre el préstamo, incluyendo el monto del préstamo, la tasa de interés y el calendario de pagos.'),
});
export type CustomerRiskInput = z.infer<typeof CustomerRiskInputSchema>;

const CustomerRiskOutputSchema = z.object({
  riskScore: z
    .number()
    .describe('Una puntuación numérica que indica el riesgo de que el cliente entre en mora (0-100).'),
  riskLevel: z
    .string()
    .describe('Un nivel de riesgo categórico (Bajo, Medio, Alto) basado en la puntuación de riesgo.'),
  riskFactors: z
    .string()
    .describe('Un resumen de los factores clave que contribuyen a la evaluación de riesgos.'),
  recommendedActions: z
    .string()
    .describe('Acciones recomendadas para los gestores de cobros basadas en la evaluación de riesgos.'),
});
export type CustomerRiskOutput = z.infer<typeof CustomerRiskOutputSchema>;

export async function assessCustomerRisk(input: CustomerRiskInput): Promise<CustomerRiskOutput> {
  return assessCustomerRiskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'customerRiskAssessmentPrompt',
  input: {schema: CustomerRiskInputSchema},
  output: {schema: CustomerRiskOutputSchema},
  prompt: `Eres un asistente de IA que evalúa el riesgo de que los clientes se atrasen en sus préstamos.

Se te proporcionan datos del cliente y detalles del préstamo. Basado en esta información, calcularás una puntuación de riesgo (0-100), determinarás un nivel de riesgo (Bajo, Medio, Alto), resumirás los factores de riesgo clave y recomendarás acciones para los gestores de cobros.

Datos del Cliente: {{{customerData}}}
Detalles del Préstamo: {{{loanDetails}}}

Responde con un objeto JSON con las siguientes claves:
- riskScore: Una puntuación numérica que indica el riesgo de que el cliente entre en mora (0-100).
- riskLevel: Un nivel de riesgo categórico (Bajo, Medio, Alto) basado en la puntuación de riesgo.
- riskFactors: Un resumen de los factores clave que contribuyen a la evaluación de riesgos.
- recommendedActions: Acciones recomendadas para los gestores de cobros basadas en la evaluación de riesgos.`,
});

const assessCustomerRiskFlow = ai.defineFlow(
  {
    name: 'assessCustomerRiskFlow',
    inputSchema: CustomerRiskInputSchema,
    outputSchema: CustomerRiskOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
