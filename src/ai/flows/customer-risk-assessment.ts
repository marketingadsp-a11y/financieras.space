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
    .describe('Comprehensive data about the customer including financial history, payment behavior, and demographic information.'),
  loanDetails: z
    .string()
    .describe('Details about the loan, including loan amount, interest rate, and repayment schedule.'),
});
export type CustomerRiskInput = z.infer<typeof CustomerRiskInputSchema>;

const CustomerRiskOutputSchema = z.object({
  riskScore: z
    .number()
    .describe('A numerical score indicating the risk of the customer becoming delinquent (0-100).'),
  riskLevel: z
    .string()
    .describe('A categorical risk level (Low, Medium, High) based on the risk score.'),
  riskFactors: z
    .string()
    .describe('A summary of the key factors contributing to the risk assessment.'),
  recommendedActions: z
    .string()
    .describe('Recommended actions for collections managers based on the risk assessment.'),
});
export type CustomerRiskOutput = z.infer<typeof CustomerRiskOutputSchema>;

export async function assessCustomerRisk(input: CustomerRiskInput): Promise<CustomerRiskOutput> {
  return assessCustomerRiskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'customerRiskAssessmentPrompt',
  input: {schema: CustomerRiskInputSchema},
  output: {schema: CustomerRiskOutputSchema},
  prompt: `You are an AI assistant that assesses the risk of customers becoming delinquent on their loans.

You are provided with customer data and loan details. Based on this information, you will calculate a risk score (0-100), determine a risk level (Low, Medium, High), summarize the key risk factors, and recommend actions for collections managers.

Customer Data: {{{customerData}}}
Loan Details: {{{loanDetails}}}

Respond with a JSON object with the following keys:
- riskScore: A numerical score indicating the risk of the customer becoming delinquent (0-100).
- riskLevel: A categorical risk level (Low, Medium, High) based on the risk score.
- riskFactors: A summary of the key factors contributing to the risk assessment.
- recommendedActions: Recommended actions for collections managers based on the risk assessment.`,
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
