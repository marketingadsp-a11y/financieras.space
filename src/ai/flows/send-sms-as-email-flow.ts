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

        let messageBody = profile.smsEmailTemplate;

        // Dynamically replace all customer fields as placeholders
        for (const key in customer) {
            if (Object.prototype.hasOwnProperty.call(customer, key)) {
                const placeholder = `{${key.toUpperCase()}}`;
                let value = (customer as any)[key];

                // Format numbers and dates nicely
                if (typeof value === 'number') {
                    value = value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                } else if (value instanceof Date) {
                    value = value.toLocaleDateString('es-MX');
                }
                
                messageBody = messageBody.replace(new RegExp(placeholder, 'g'), String(value || ''));
            }
        }
        
        // Ensure DEBE is formatted as currency, as it was specifically requested before.
        messageBody = messageBody.replace(/{DEBE}/g, (customer.dueAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));


        const result = await sendEmail({
            to: [toEmail],
            subject: profile.smsApiKey,
            text: messageBody,
            from: profile.resendFromEmail,
        });

        if (result.success) {
            return { success: true, message: 'SMS enviado al cliente' };
        } else {
            return { success: false, message: result.message };
        }

    } catch (e: any) {
        console.error("Error in sendSmsAsEmailFlow: ", e);
        return { success: false, message: e.message || "Un error inesperado ocurrió en el flujo." };
    }
  }
);
