
'use server';
/**
 * @fileOverview An AI flow to parse daily record data from unstructured text.
 *
 * - parseDailyRecords - A function that handles parsing of daily financial records.
 * - DailyRecordParserInput - The input type for the parseDailyRecords function.
 * - DailyRecordParserOutput - The return type for the parseDailyRecords function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DailyRecordParserInputSchema = z.object({
  inputText: z.string().describe("A string of text containing daily financial records, typically pasted from a spreadsheet where columns are separated by tabs and rows by newlines."),
});
export type DailyRecordParserInput = z.infer<typeof DailyRecordParserInputSchema>;

const ParsedRecordSchema = z.object({
    date: z.string().describe("The date of the transaction in YYYY-MM-DD format."),
    type: z.enum(['collected', 'loaned', 'spent']).describe("The type of the record. Should be 'collected' for income/payments, 'loaned' for new loans, or 'spent' for expenses."),
    description: z.string().describe("A brief description of the transaction."),
    category: z.string().optional().describe("The category of the transaction, especially for expenses. 'N/A' if not applicable."),
    amount: z.number().describe("The amount of the transaction."),
});

const DailyRecordParserOutputSchema = z.array(ParsedRecordSchema);
export type DailyRecordParserOutput = z.infer<typeof DailyRecordParserOutputSchema>;


export async function parseDailyRecords(input: DailyRecordParserInput): Promise<DailyRecordParserOutput> {
  return dailyRecordParserFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dailyRecordParserPrompt',
  input: {schema: DailyRecordParserInputSchema},
  output: {schema: DailyRecordParserOutputSchema},
  prompt: `You are an expert data processor specializing in financial records. Your task is to parse the following text, which contains daily transaction data pasted from a spreadsheet.
The data is semi-structured. Each line represents a transaction. The columns are likely separated by tabs.
The columns could be in any order, but common headers might include: FECHA, TIPO, DESCRIPCION, CATEGORIA, MONTO, COBRADO, PRESTADO, GASTO.
Your job is to intelligently identify the correct data for each field in the output schema.

- For the 'date' field, convert any found date into YYYY-MM-DD format.
- For the 'type' field, infer whether the record is 'collected', 'loaned', or 'spent' based on the context of the columns or description.
- For numerical fields like 'amount', clean the data to remove currency symbols, commas, or any other non-numeric characters.
- If a value is not present for a field like 'category', set it to 'N/A' or omit it.

Parse the data and return a JSON array of daily records.

Input Text:
{{{inputText}}}
`,
});

const dailyRecordParserFlow = ai.defineFlow(
  {
    name: 'dailyRecordParserFlow',
    inputSchema: DailyRecordParserInputSchema,
    outputSchema: DailyRecordParserOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
