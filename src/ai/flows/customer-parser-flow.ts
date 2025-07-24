
'use server';
/**
 * @fileOverview An AI flow to parse customer data from unstructured text.
 *
 * - parseCustomers - A function that handles parsing of customer data from text.
 * - CustomerParserInput - The input type for the parseCustomers function.
 * - CustomerParserOutput - The return type for the parsing functions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// --- Text-based Parsing ---

const CustomerParserInputSchema = z.object({
  inputText: z.string().describe("A string of text containing customer data, typically pasted from a spreadsheet where columns are separated by tabs and rows by newlines."),
});
export type CustomerParserInput = z.infer<typeof CustomerParserInputSchema>;

const ParsedCustomerSchema = z.object({
    carteraName: z.string().describe("The name of the portfolio ('cartera') the customer belongs to. This is crucial for organizing groups. This field should never be null or empty."),
    responsable: z.string().optional().describe("The person responsible for the portfolio ('cartera')."),
    groupName: z.string().describe("The name of the group the customer belongs to. This field is crucial for organizing customers. This field should never be null or empty."),
    promoter: z.string().optional().describe("The promoter or salesperson associated with the customer."),
    fechaPrestamo: z.string().optional().describe("The date the loan was given, in YYYY-MM-DD format."),
    name: z.string().describe("The full name of the customer."),
    address: z.string().describe("The customer's full address, street and number."),
    phone: z.string().describe("The customer's phone number."),
    guarantor: z.string().describe("The name of the guarantor, or 'NO' if none."),
    guarantorPhone: z.string().optional().describe("The guarantor's phone number."),
    loanAmount: z.number().describe("The initial amount of the loan."),
    paymentAmount: z.number().optional().describe("The amount for each payment or installment."),
    installmentsDue: z.number().optional().describe("The number of overdue installments."),
    dueAmount: z.number().describe("The outstanding amount owed by the customer."),
});

const CustomerParserOutputSchema = z.array(ParsedCustomerSchema);
export type CustomerParserOutput = z.infer<typeof CustomerParserOutputSchema>;
export type ParsedCustomer = z.infer<typeof ParsedCustomerSchema>;


export async function parseCustomers(input: CustomerParserInput): Promise<CustomerParserOutput> {
  return customerParserFlow(input);
}

const prompt = ai.definePrompt({
  name: 'customerParserPrompt',
  input: {schema: CustomerParserInputSchema},
  output: {schema: CustomerParserOutputSchema},
  prompt: `You are an expert data processor. Your task is to parse the following text, which contains customer data pasted from a spreadsheet.
The data is semi-structured. Each line represents a customer. The columns are likely separated by tabs.
The column order is CRITICAL. The first column is GRUPO, the second is PROMOTOR, the third is FECHA, and so on. The expected headers are: GRUPO, PROMOTOR, FECHA, NOMBRE, DIRECCION, TELEFONO, AVAL, TEL AVAL, PRESTAMO, PAGO, NO.VENC., DEBE.

**Rules for parsing:**
1.  **Strict Column Order**: The first column is ALWAYS 'groupName'. The second column is ALWAYS 'promoter'. DO NOT confuse them.
2.  **CARTERA Identification**: You must identify the 'CARTERA' and 'RESPONSABLE' fields, which are usually on their own lines above a set of customer rows. Associate all subsequent customers with the most recently found CARTERA.
3.  **Hierarchy Inference**: If a row does not have an explicit cartera or group name, you MUST infer it from a previous row. It is absolutely crucial that every customer belongs to a named cartera and a named group. The 'carteraName' and 'groupName' fields should never be null or empty.
4.  **Data Cleaning**: For numerical fields, clean the data to remove currency symbols, commas, or any other non-numeric characters. If a value is not present, use a sensible default (e.g., 0 for numbers, empty string for text).
5.  **Date Formatting**: For the 'fechaPrestamo' field, convert any found date into YYYY-MM-DD format.

Parse the data and return a JSON array of customers.

Input Text:
{{{inputText}}}
`,
});

const customerParserFlow = ai.defineFlow(
  {
    name: 'customerParserFlow',
    inputSchema: CustomerParserInputSchema,
    outputSchema: CustomerParserOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
