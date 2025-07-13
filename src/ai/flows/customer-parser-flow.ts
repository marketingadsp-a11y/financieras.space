
'use server';
/**
 * @fileOverview An AI flow to parse customer data from unstructured text.
 *
 * - parseCustomers - A function that handles parsing of customer data.
 * - CustomerParserInput - The input type for the parseCustomers function.
 * - CustomerParserOutput - The return type for the parseCustomers function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CustomerParserInputSchema = z.object({
  inputText: z.string().describe("A string of text containing customer data, typically pasted from a spreadsheet where columns are separated by tabs and rows by newlines."),
});
export type CustomerParserInput = z.infer<typeof CustomerParserInputSchema>;

const ParsedCustomerSchema = z.object({
    name: z.string().describe("The full name of the customer."),
    address: z.string().describe("The customer's full address."),
    phone: z.string().describe("The customer's phone number."),
    guarantor: z.string().describe("The name of the guarantor, or 'NO' if none."),
    loanAmount: z.number().describe("The initial amount of the loan."),
    dueAmount: z.number().describe("The outstanding amount owed by the customer."),
});

const CustomerParserOutputSchema = z.array(ParsedCustomerSchema);
export type CustomerParserOutput = z.infer<typeof CustomerParserOutputSchema>;


export async function parseCustomers(input: CustomerParserInput): Promise<CustomerParserOutput> {
  return customerParserFlow(input);
}

const prompt = ai.definePrompt({
  name: 'customerParserPrompt',
  input: {schema: CustomerParserInputSchema},
  output: {schema: CustomerParserOutputSchema},
  prompt: `You are an expert data processor. Your task is to parse the following text, which contains customer data pasted from a spreadsheet.
The data is semi-structured. Each line represents a customer. The columns are likely separated by tabs.
The columns could be in any order, but common headers include: FECHA, NOMBRE, DIRECCION, TELEFONO, AVAL, PRESTAMO, PAGO, ADEUDO. Your job is to intelligently identify the correct data for each field in the output schema.
For numerical fields like 'loanAmount' and 'dueAmount', clean the data to remove currency symbols, commas, or any other non-numeric characters. If a value is not present, use a sensible default (e.g., 0 for numbers, empty string for text).

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
