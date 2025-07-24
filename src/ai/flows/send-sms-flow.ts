
'use server';
/**
 * @fileOverview An AI flow to send an SMS message via LabsMobile.
 *
 * - sendSms - A function that handles sending the SMS.
 * - SendSmsInput - The input type for the sendSms function.
 * - SendSmsOutput - The return type for the sendSms function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { sendSms as sendSmsService } from '@/services/labsmobile-service';

const SendSmsInputSchema = z.object({
  to: z.string().describe("The recipient's phone number, including country code but without '+' or '00'."),
  message: z.string().describe("The text message content to send."),
  sender: z.string().optional().describe("The alphanumeric sender ID (TPOA)."),
});
export type SendSmsInput = z.infer<typeof SendSmsInputSchema>;

const SendSmsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendSmsOutput = z.infer<typeof SendSmsOutputSchema>;

export async function sendSms(input: SendSmsInput): Promise<SendSmsOutput> {
  return sendSmsFlow(input);
}

const sendSmsFlow = ai.defineFlow(
  {
    name: 'sendSmsFlow',
    inputSchema: SendSmsInputSchema,
    outputSchema: SendSmsOutputSchema,
  },
  async ({ to, message, sender }) => {
    try {
        const result = await sendSmsService({ to, message, sender });
        if (result.code === 0) {
            return { success: true, message: "SMS enviado correctamente." };
        } else {
             return { success: false, message: `Error (${result.code}): ${result.message}` };
        }
    } catch (error: any) {
        console.error("Error in sendSmsFlow:", error);
        return { success: false, message: error.message || "Error desconocido al enviar el SMS." };
    }
  }
);
