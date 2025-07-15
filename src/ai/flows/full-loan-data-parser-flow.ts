
'use server';
/**
 * @fileOverview An AI flow to parse and import full loan control data from an Excel file.
 *
 * - processAndImportLoanData - A function that handles parsing and importing loan data from a base64 encoded excel file.
 * - FullLoanDataParserInput - The input type for the processAndImportLoanData function.
 * - FullLoanDataParserOutput - The return type for the processAndImportLoanData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as XLSX from 'xlsx';
import { importFullLoanData } from '@/services/loan-control-service';


const FullLoanDataParserInputSchema = z.object({
  fileContentBase64: z.string().describe("The content of the Excel file, encoded in Base64."),
  importMode: z.enum(['add', 'replace']).describe("The import mode: 'add' to append data, 'replace' to overwrite."),
  prefix: z.string().describe("The user's company prefix."),
});
export type FullLoanDataParserInput = z.infer<typeof FullLoanDataParserInputSchema>;

const FullLoanDataParserOutputSchema = z.object({
  success: z.boolean(),
  processedRows: z.number(),
  message: z.string(),
});
export type FullLoanDataParserOutput = z.infer<typeof FullLoanDataParserOutputSchema>;


export async function processAndImportLoanData(input: FullLoanDataParserInput): Promise<FullLoanDataParserOutput> {
  return fullLoanDataParserFlow(input);
}


const fullLoanDataParserFlow = ai.defineFlow(
  {
    name: 'fullLoanDataParserFlow',
    inputSchema: FullLoanDataParserInputSchema,
    outputSchema: FullLoanDataParserOutputSchema,
  },
  async ({ fileContentBase64, importMode, prefix }) => {
    try {
        const buffer = Buffer.from(fileContentBase64, 'base64');
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            defval: "", 
        });

        if (!json || json.length === 0) {
            return { success: false, processedRows: 0, message: "El archivo Excel está vacío o no se pudo leer." };
        }

        await importFullLoanData(json as any, importMode, prefix);
        
        return { success: true, processedRows: json.length, message: `Se procesaron ${json.length} filas del archivo.` };

    } catch (error: any) {
        console.error("Error processing loan data file:", error);
        return { success: false, processedRows: 0, message: error.message || "Error desconocido al procesar el archivo." };
    }
  }
);
