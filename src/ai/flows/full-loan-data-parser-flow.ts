
'use server';
/**
 * @fileOverview An AI flow to parse a full hierarchy of loan data from unstructured text.
 * Handles Plaza > Cartera > Grupo > Cliente structure.
 *
 * - parseFullLoanData - A function that handles parsing of the full loan data hierarchy.
 * - FullLoanDataParserInput - The input type for the parseFullLoanData function.
 * - FullLoanDataParserOutput - The return type for the parseFullLoanData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FullLoanDataParserInputSchema = z.object({
  inputText: z.string().describe("A string of text containing hierarchical loan data, typically pasted from a spreadsheet. The AI must identify Plazas, Carteras, Grupos, and individual Customers."),
});
export type FullLoanDataParserInput = z.infer<typeof FullLoanDataParserInputSchema>;

const ParsedCustomerSchema = z.object({
    name: z.string().describe("The full name of the customer."),
    address: z.string().describe("The customer's full address, street and number."),
    colonia: z.string().optional().describe("The customer's neighborhood or 'colonia'."),
    cp: z.string().optional().describe("The customer's postal code ('código postal')."),
    phone: z.string().describe("The customer's phone number."),
    guarantor: z.string().describe("The name of the guarantor, or 'NO' if none."),
    guarantorPhone: z.string().optional().describe("The guarantor's phone number."),
    direccionAval: z.string().optional().describe("The guarantor's full address."),
    coloniaAval: z.string().optional().describe("The guarantor's neighborhood or 'colonia'."),
    cpAval: z.string().optional().describe("The guarantor's postal code ('código postal')."),
    loanAmount: z.number().describe("The initial amount of the loan."),
    paymentAmount: z.number().optional().describe("The amount for each payment or installment."),
    installmentsDue: z.number().optional().describe("The number of overdue installments."),
    dueAmount: z.number().describe("The outstanding amount owed by the customer."),
    fechaPrestamo: z.string().optional().describe("The date the loan was given, in YYYY-MM-DD format."),
});

const ParsedGrupoSchema = z.object({
    groupName: z.string().describe("The name of the group the customer belongs to."),
    customers: z.array(ParsedCustomerSchema),
});

const ParsedCarteraSchema = z.object({
    carteraName: z.string().describe("The name of the portfolio ('cartera') the group belongs to."),
    responsable: z.string().optional().describe("The person responsible for the portfolio ('cartera')."),
    grupos: z.array(ParsedGrupoSchema),
});

const ParsedPlazaSchema = z.object({
    plazaName: z.string().describe("The name of the plaza ('plaza') this cartera belongs to."),
    carteras: z.array(ParsedCarteraSchema),
});

const FullLoanDataParserOutputSchema = z.array(ParsedPlazaSchema);
export type FullLoanDataParserOutput = z.infer<typeof FullLoanDataParserOutputSchema>;


export async function parseFullLoanData(input: FullLoanDataParserInput): Promise<FullLoanDataParserOutput> {
  return fullLoanDataParserFlow(input);
}

const prompt = ai.definePrompt({
  name: 'fullLoanDataParserPrompt',
  input: {schema: FullLoanDataParserInputSchema},
  output: {schema: FullLoanDataParserOutputSchema},
  prompt: `You are an expert data processor. Your task is to parse the following text, which contains customer data pasted from a spreadsheet, and structure it into a JSON format representing Plazas, Carteras, Grupos, and Customers.
The data is semi-structured. Each line represents a customer. The columns are likely separated by tabs.
Common headers include: PLAZA, CARTERA, RESPONSABLE, GRUPO, FECHA, NOMBRE, DIRECCION, COLONIA, CP, TELEFONO, AVAL, TEL AVAL, DIR AVAL, COL AVAL, CP AVAL, PRESTAMO, PAGO, VENCIDOS, ADEUDO.

Your job is to intelligently identify the correct data for each field in the output schema and build the hierarchy.

**CRITICAL HIERARCHY RULES**:
- A Customer belongs to a Grupo.
- A Grupo belongs to a Cartera.
- A Cartera belongs to a Plaza.
- You MUST identify the 'PLAZA', 'CARTERA', and 'GRUPO' for each customer.
- If a row does not have an explicit plaza, cartera, or group name, you MUST infer it from the previous row that did. It is absolutely crucial that every customer belongs to a named group, which belongs to a named cartera, which belongs to a named plaza. Do not create entries with empty names for these hierarchy levels.

**DATA CLEANING RULES**:
- For numerical fields, clean the data to remove currency symbols, commas, or any other non-numeric characters. If a value is not present, use a sensible default (e.g., 0 for numbers, empty string for text).
- For the 'fechaPrestamo' field, convert any found date into YYYY-MM-DD format.

Parse the data and return a JSON array following the hierarchical structure defined in the output schema.

Input Text:
{{{inputText}}}
`,
});

const fullLoanDataParserFlow = ai.defineFlow(
  {
    name: 'fullLoanDataParserFlow',
    inputSchema: FullLoanDataParserInputSchema,
    outputSchema: FullLoanDataParserOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
