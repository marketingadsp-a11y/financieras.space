
'use server';
/**
 * @fileOverview An AI flow to send an SMS by formatting it as an email.
 *
 * - sendSmsAsEmail - A function that handles sending the SMS-formatted email.
 * - SendSmsAsEmailInput - The input type for the sendSmsAsEmail function.
 * - SendSmsAsEmailOutput - The return type for the sendSmsAsEmail function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { sendEmail } from '@/services/email-service';
import { getCompanyProfileByPrefix } from '@/services/company-profile-service';
import type { Customer } from '@/lib/data';

const SendSmsAsEmailInputSchema = z.object({
  prefix: z.string().describe("The company prefix to retrieve API credentials and templates."),
  customer: z.any().describe("The full customer object containing their details."),
});
export type SendSmsAsEmailInput = z.infer<typeof SendSmsAsEmailInputSchema>;

const SendSmsAsEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendSmsAsEmailOutput = z.infer<typeof SendSmsAsEmailOutputSchema>;

export async function sendSmsAsEmail(input: SendSmsAsEmailInput): Promise<SendSmsAsEmailOutput> {
  return sendSmsAsEmailFlow(input);
}

const sendSmsAsEmailFlow = ai.defineFlow(
  {
    name: 'sendSmsAsEmailFlow',
    inputSchema: SendSmsAsEmailInputSchema,
    outputSchema: SendSmsAsEmailOutputSchema,
  },
  async ({ prefix, customer }) => {
    try {
        const profile = await getCompanyProfileByPrefix(prefix);
        if (!profile || !profile.smsEmailTemplate) {
            return { success: false, message: "La plantilla de SMS (Email) no está configurada en el Perfil de Empresa." };
        }
        
        if (!customer.phone) {
            return { success: false, message: "El cliente no tiene un número de teléfono registrado." };
        }

        const toAddress = `52${customer.phone.replace(/\D/g, '')}@api.labsmobile.com`;
        const subject = 'rkkrCRWGPAgLzktwh0bd0MKcjWmexgwO';
        
        let messageBody = profile.smsEmailTemplate;
        messageBody = messageBody.replace(/{NOMBRE}/g, customer.name);
        messageBody = messageBody.replace(/{DEBE}/g, customer.dueAmount.toLocaleString('es-MX'));

        const result = await sendEmail({ 
            to: toAddress,
            subject: subject,
            html: `<p>${messageBody}</p>`, // Wrapping in <p> for basic HTML formatting
        });

        if (result.success) {
            return { success: true, message: "SMS enviado correctamente a través del gateway de email." };
        } else {
             return { success: false, message: result.message };
        }
    } catch (error: any) {
        console.error("Error in sendSmsAsEmailFlow:", error);
        return { success: false, message: error.message || "Error desconocido al enviar el email." };
    }
  }
);
