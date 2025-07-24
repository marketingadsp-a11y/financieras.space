'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendEmail } from '@/services/email-service';
import type { Customer } from '@/lib/data';
import { getCompanyProfileByPrefix } from '@/services/company-profile-service';

const SendSmsAsEmailInputSchema = z.object({
  customer: z.any().describe("The full customer object."),
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
  async ({ customer }: { customer: Customer }) => {
    if (!customer.prefix) {
      return { success: false, message: "El cliente no tiene un prefijo de empresa asociado." };
    }
    
    if (!customer.phone) {
        return { success: false, message: "El cliente no tiene un número de teléfono registrado." };
    }
    
    try {
        const profile = await getCompanyProfileByPrefix(customer.prefix);

        if (!profile?.smsEmailTemplate || !profile.smsDomain || !profile.smsApiKey || !profile.resendFromEmail) {
            return { success: false, message: "La configuración de Email-to-SMS (plantilla, dominio, clave o correo remitente) no está completa en el Perfil de Empresa." };
        }

        const toEmail = `52${customer.phone.replace(/\D/g, '')}${profile.smsDomain}`;

        let messageBody = profile.smsEmailTemplate
            .replace(/{NOMBRE}/g, customer.name)
            .replace(/{DEBE}/g, (customer.dueAmount || 0).toLocaleString('es-MX'));

        const result = await sendEmail({
            to: [toEmail],
            subject: profile.smsApiKey,
            text: messageBody,
            from: profile.resendFromEmail,
        });

        if (result.success) {
            return { success: true, message: 'SMS enviado a través de la pasarela de correo.' };
        } else {
            return { success: false, message: result.message };
        }

    } catch (e: any) {
        console.error("Error in sendSmsAsEmailFlow: ", e);
        return { success: false, message: e.message || "Un error inesperado ocurrió en el flujo." };
    }
  }
);
